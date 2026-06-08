import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * Generate an access token (short-lived)
 */
export const generateAccessToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    });
};

/**
 * Generate a refresh token (long-lived)
 */
export const generateRefreshToken = (userId) => {
    return jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    });
};

/**
 * Set token as HTTP-only cookie and return in response body
 */
export const sendTokenResponse = (user, statusCode, res) => {
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    const refreshCookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    };

    const accessCookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: parseInt(process.env.ACCESS_TOKEN_MAX_AGE_MS || `${15 * 60 * 1000}`), // default 15 minutes
    };

    // Remove password from output
    const userObj = user.toObject();
    delete userObj.password;

    // Persist a hashed refresh token on the user for server-side invalidation
    try {
        const hashed = crypto.createHash('sha256').update(refreshToken).digest('hex');
        // Set fields and save silently (do not block response)
        user.refreshToken = hashed;
        user.refreshTokenExpires = new Date(Date.now() + (7 * 24 * 60 * 60 * 1000));
        // Save without selecting password
        user.save().catch((err) => {
            console.error('Failed to save refresh token on user:', err.message);
        });
    } catch (err) {
        console.error('Failed to hash/save refresh token:', err.message);
    }

    // Set access token as httpOnly cookie and refresh token as httpOnly cookie
    res.status(statusCode)
        .cookie('accessToken', accessToken, accessCookieOptions)
        .cookie('refreshToken', refreshToken, refreshCookieOptions)
        .json({
            success: true,
            user: userObj,
        });
};
