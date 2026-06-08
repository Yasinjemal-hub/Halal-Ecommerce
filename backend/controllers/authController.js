import crypto from 'crypto';
import User from '../models/User.js';
import { sendTokenResponse, generateAccessToken } from '../utils/generateToken.js';
import sendEmail from '../utils/sendEmail.js';
import jwt from 'jsonwebtoken';

/**
 * @desc    Register a new user
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res, next) => {
    try {
        const { firstName, lastName, email, password, phone, role } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: 'A user with this email already exists',
            });
        }

        // Create user
        const user = await User.create({
            firstName,
            lastName,
            email,
            password,
            phone,
            role: role === 'merchant' ? 'merchant' : 'consumer', // Only allow consumer/merchant at registration
        });

        // Generate email verification token
        const verificationToken = crypto.randomBytes(32).toString('hex');
        user.emailVerificationToken = crypto
            .createHash('sha256')
            .update(verificationToken)
            .digest('hex');
        user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        await user.save();

        // Send verification email
        const verificationUrl = `${process.env.CLIENT_URL}/verify-email/${verificationToken}`;
        try {
            await sendEmail({
                to: user.email,
                subject: 'Verify Your Email — Halal E-Commerce',
                html: `
                    <h2>Welcome to Halal E-Commerce!</h2>
                    <p>Please verify your email by clicking the link below:</p>
                    <a href="${verificationUrl}">${verificationUrl}</a>
                    <p>This link expires in 24 hours.</p>
                `,
            });
        } catch (emailError) {
            console.error('Email sending failed:', emailError.message);
            // Registration still succeeds even if email fails
        }

        sendTokenResponse(user, 201, res);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Login user
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Please provide email and password',
            });
        }

        // Find user and include password
        const user = await User.findOne({ email }).select('+password');

        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        // Check password
        const isMatch = await user.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid email or password',
            });
        }

        if (!user.isActive) {
            return res.status(403).json({
                success: false,
                message: 'Your account has been deactivated. Please contact support.',
            });
        }

        // Update last login
        user.lastLogin = new Date();
        await user.save();

        sendTokenResponse(user, 200, res);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Logout (clear cookie)
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = (req, res) => {
    try {
        const token = req.cookies?.refreshToken;
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
                if (decoded?.id) {
                    User.findByIdAndUpdate(decoded.id, {
                        $unset: { refreshToken: 1, refreshTokenExpires: 1 },
                    }).catch((err) => {
                        console.error('Failed to clear refresh token for user:', err.message);
                    });
                }
            } catch (err) {
                // Token invalid/expired — still clear cookie client-side
            }
        }

        // Clear both refresh and access tokens
        res.cookie('refreshToken', '', {
            httpOnly: true,
            expires: new Date(0),
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });
        res.cookie('accessToken', '', {
            httpOnly: true,
            expires: new Date(0),
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });

        res.status(200).json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        console.error('Logout error:', err.message);
        res.status(200).cookie('refreshToken', '', { expires: new Date(0) }).json({ success: true, message: 'Logged out' });
    }
};

/**
 * @desc    Verify email
 * @route   GET /api/auth/verify-email/:token
 * @access  Public
 */
export const verifyEmail = async (req, res, next) => {
    try {
        const hashedToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            emailVerificationToken: hashedToken,
            emailVerificationExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired verification token',
            });
        }

        user.isEmailVerified = true;
        // Fully invalidate the verification token and reset attempts
        user.emailVerificationToken = null;
        user.emailVerificationExpires = null;
        user.emailVerificationAttempts = 0;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Email verified successfully',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Forgot password — send reset email
 * @route   POST /api/auth/forgot-password
 * @access  Public
 */
export const forgotPassword = async (req, res, next) => {
    try {
        const user = await User.findOne({ email: req.body.email });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'No user found with that email',
            });
        }

        // Generate reset token
        const resetToken = crypto.randomBytes(32).toString('hex');
        user.passwordResetToken = crypto
            .createHash('sha256')
            .update(resetToken)
            .digest('hex');
        user.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
        await user.save();

        const resetUrl = `${process.env.CLIENT_URL}/reset-password/${resetToken}`;

        try {
            await sendEmail({
                to: user.email,
                subject: 'Password Reset — Halal E-Commerce',
                html: `
                    <h2>Password Reset Request</h2>
                    <p>Click the link below to reset your password:</p>
                    <a href="${resetUrl}">${resetUrl}</a>
                    <p>This link expires in 1 hour.</p>
                    <p>If you didn't request this, please ignore this email.</p>
                `,
            });

            res.status(200).json({
                success: true,
                message: 'Password reset email sent',
            });
        } catch (emailError) {
            user.passwordResetToken = undefined;
            user.passwordResetExpires = undefined;
            await user.save();

            return res.status(500).json({
                success: false,
                message: 'Failed to send reset email. Please try again later.',
            });
        }
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Reset password
 * @route   PUT /api/auth/reset-password/:token
 * @access  Public
 */
export const resetPassword = async (req, res, next) => {
    try {
        const hashedToken = crypto
            .createHash('sha256')
            .update(req.params.token)
            .digest('hex');

        const user = await User.findOne({
            passwordResetToken: hashedToken,
            passwordResetExpires: { $gt: Date.now() },
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired reset token',
            });
        }

        user.password = req.body.password;
        // Invalidate reset token
        user.passwordResetToken = null;
        user.passwordResetExpires = null;
        await user.save();

        sendTokenResponse(user, 200, res);
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh-token
 * @access  Public (uses refresh cookie)
 */
export const refreshToken = async (req, res, next) => {
    try {
        const token = req.cookies?.refreshToken;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No refresh token provided',
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
        const user = await User.findById(decoded.id).select('+refreshToken +refreshTokenExpires');

        if (!user || !user.isActive) {
            return res.status(401).json({
                success: false,
                message: 'Invalid refresh token',
            });
        }

        // Verify that the refresh token matches the hashed token stored for the user
        const hashed = require('crypto').createHash('sha256').update(token).digest('hex');

        if (!user.refreshToken || user.refreshToken !== hashed) {
            return res.status(401).json({ success: false, message: 'Refresh token revoked' });
        }

        // Verify expiry
        if (user.refreshTokenExpires && new Date(user.refreshTokenExpires) < new Date()) {
            return res.status(401).json({ success: false, message: 'Refresh token expired' });
        }

        const accessToken = generateAccessToken(user._id);

        // Set new access token as httpOnly cookie
        const accessCookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: parseInt(process.env.ACCESS_TOKEN_MAX_AGE_MS || `${15 * 60 * 1000}`),
        };

        res.status(200)
            .cookie('accessToken', accessToken, accessCookieOptions)
            .json({ success: true });
    } catch (error) {
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired refresh token',
        });
    }
};
