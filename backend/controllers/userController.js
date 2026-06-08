import User from '../models/User.js';

/**
 * @desc    Get current user profile
 * @route   GET /api/users/profile
 * @access  Private
 */
export const getProfile = async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id);

        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/users/profile
 * @access  Private
 */
export const updateProfile = async (req, res, next) => {
    try {
        const immediateFields = ['address', 'preferredLanguage', 'avatar'];
        const pendingFields = ['firstName', 'lastName', 'email', 'phone'];

        const updates = {};
        const pendingProfileUpdate = {};

        immediateFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

        pendingFields.forEach((field) => {
            if (req.body[field] !== undefined && req.body[field] !== req.user[field]) {
                pendingProfileUpdate[field] = req.body[field];
            }
        });

        if (pendingProfileUpdate.email) {
            const existingUser = await User.findOne({
                email: pendingProfileUpdate.email,
                _id: { $ne: req.user._id },
            });
            if (existingUser) {
                return res.status(400).json({
                    success: false,
                    message: 'That email address is already in use.',
                });
            }
        }

        if (Object.keys(pendingProfileUpdate).length) {
            updates.pendingProfileUpdate = {
                ...pendingProfileUpdate,
                requestedAt: new Date(),
                status: 'pending',
            };
        }

        if (!Object.keys(updates).length) {
            return res.status(400).json({
                success: false,
                message: 'No profile fields were updated.',
            });
        }

        const user = await User.findByIdAndUpdate(req.user._id, updates, {
            new: true,
            runValidators: true,
        });

        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update password
 * @route   PUT /api/users/password
 * @access  Private
 */
export const updatePassword = async (req, res, next) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user._id).select('+password');

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect',
            });
        }

        user.password = newPassword;
        await user.save();

        res.status(200).json({
            success: true,
            message: 'Password updated successfully',
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Delete (deactivate) user account
 * @route   DELETE /api/users/account
 * @access  Private
 */
export const deleteAccount = async (req, res, next) => {
    try {
        await User.findByIdAndUpdate(req.user._id, { isActive: false });

        // Clear stored refresh token server-side
        await User.findByIdAndUpdate(req.user._id, { $unset: { refreshToken: 1, refreshTokenExpires: 1 } });

        res.cookie('refreshToken', '', {
            httpOnly: true,
            expires: new Date(0),
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
        });

        res.status(200).json({
            success: true,
            message: 'Account deactivated successfully',
        });
    } catch (error) {
        next(error);
    }
};
