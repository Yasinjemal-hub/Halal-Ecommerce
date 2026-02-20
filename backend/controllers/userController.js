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
        const allowedFields = [
            'firstName',
            'lastName',
            'phone',
            'address',
            'preferredLanguage',
            'avatar',
        ];

        const updates = {};
        allowedFields.forEach((field) => {
            if (req.body[field] !== undefined) {
                updates[field] = req.body[field];
            }
        });

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

        res.cookie('refreshToken', '', {
            httpOnly: true,
            expires: new Date(0),
        });

        res.status(200).json({
            success: true,
            message: 'Account deactivated successfully',
        });
    } catch (error) {
        next(error);
    }
};
