import User from '../models/User.js';
import Merchant from '../models/Merchant.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Certification from '../models/Certification.js';

/**
 * @desc    Get all users (with pagination & filtering)
 * @route   GET /api/admin/users
 * @access  Admin
 */
export const getAllUsers = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.role) filter.role = req.query.role;
        if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

        const [users, total] = await Promise.all([
            User.find(filter).skip(skip).limit(limit).sort({ createdAt: -1 }),
            User.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count: users.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            users,
        });
    } catch (error) {
        next(error);
    }
};

export const getPendingProfileUpdates = async (req, res, next) => {
    try {
        const users = await User.find({ 'pendingProfileUpdate.status': 'pending' });

        res.status(200).json({
            success: true,
            count: users.length,
            users,
        });
    } catch (error) {
        next(error);
    }
};

export const approveUserProfileUpdate = async (req, res, next) => {
    try {
        const { action, reviewNotes } = req.body;
        const normalizedAction = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : action;

        if (!['approved', 'rejected'].includes(normalizedAction)) {
            return res.status(400).json({
                success: false,
                message: "Action must be 'approved' or 'rejected'.",
            });
        }

        const user = await User.findById(req.params.id);
        if (!user || !user.pendingProfileUpdate?.status) {
            return res.status(404).json({
                success: false,
                message: 'User or pending profile update not found.',
            });
        }

        const pending = user.pendingProfileUpdate;
        if (pending.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: 'There is no pending profile update for this user.',
            });
        }

        if (action === 'approved') {
            const updateData = {};
            if (pending.firstName) updateData.firstName = pending.firstName;
            if (pending.lastName) updateData.lastName = pending.lastName;
            if (pending.email) {
                const existingUser = await User.findOne({
                    email: pending.email,
                    _id: { $ne: user._id },
                });
                if (existingUser) {
                    return res.status(400).json({
                        success: false,
                        message: 'Requested email is already in use by another account.',
                    });
                }
                updateData.email = pending.email;
            }
            if (pending.phone) updateData.phone = pending.phone;

            Object.assign(user, updateData);
            user.pendingProfileUpdate = {
                ...pending,
                status: 'approved',
                reviewedAt: new Date(),
                reviewedBy: req.user._id,
                reviewNotes,
            };
        } else {
            user.pendingProfileUpdate = {
                ...pending,
                status: 'rejected',
                reviewedAt: new Date(),
                reviewedBy: req.user._id,
                reviewNotes,
            };
        }

        await user.save();

        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Update user role
 * @route   PUT /api/admin/users/:id/role
 * @access  Admin
 */
export const updateUserRole = async (req, res, next) => {
    try {
        const { role } = req.body;

        if (!['consumer', 'merchant', 'admin'].includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role. Must be consumer, merchant, or admin.',
            });
        }

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role },
            { new: true, runValidators: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Toggle user active status
 * @route   PUT /api/admin/users/:id/status
 * @access  Admin
 */
export const toggleUserStatus = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        user.isActive = !user.isActive;
        await user.save();

        res.status(200).json({
            success: true,
            message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
            user,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get admin dashboard statistics
 * @route   GET /api/admin/dashboard
 * @access  Admin
 */
export const getDashboardStats = async (req, res, next) => {
    try {
        const [
            totalUsers,
            totalMerchants,
            totalProducts,
            totalOrders,
            pendingMerchants,
            pendingCertifications,
        ] = await Promise.all([
            User.countDocuments(),
            Merchant.countDocuments(),
            Product.countDocuments(),
            Order.countDocuments(),
            Merchant.countDocuments({ verificationStatus: 'pending' }),
            Certification.countDocuments({ status: 'pending' }),
        ]);

        // Only fetch recent orders when there are orders in the system
        let recentOrders = [];
        if (totalOrders > 0) {
            recentOrders = await Order.find()
                .sort({ createdAt: -1 })
                .limit(10)
                .populate('user', 'firstName lastName email');
        }

        // Revenue calculation
        const revenueResult = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, totalRevenue: { $sum: '$totalPrice' } } },
        ]);

        const totalRevenue = revenueResult.length > 0 ? revenueResult[0].totalRevenue : 0;

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalMerchants,
                totalProducts,
                totalOrders,
                totalRevenue,
                pendingMerchants,
                pendingCertifications,
            },
            recentOrders,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get all merchants (admin view)
 * @route   GET /api/admin/merchants
 * @access  Admin
 */
export const getAllMerchants = async (req, res, next) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.verificationStatus) filter.verificationStatus = req.query.verificationStatus;

        const [merchants, total] = await Promise.all([
            Merchant.find(filter)
                .populate('user', 'firstName lastName email phone')
                .skip(skip)
                .limit(limit)
                .sort({ createdAt: -1 }),
            Merchant.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count: merchants.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            merchants,
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Verify / update merchant verification status
 * @route   PUT /api/admin/merchants/:id/verify
 * @access  Admin
 */
export const verifyMerchant = async (req, res, next) => {
    try {
        const { verificationStatus, verificationNotes } = req.body;

        const validStatuses = ['pending', 'under_review', 'approved', 'rejected', 'suspended'];
        if (!validStatuses.includes(verificationStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
            });
        }

        const updateData = {
            verificationStatus,
            verificationNotes,
            verifiedBy: req.user._id,
        };

        if (verificationStatus === 'approved') {
            updateData.verifiedAt = new Date();
        }

        const merchant = await Merchant.findByIdAndUpdate(req.params.id, updateData, {
            new: true,
            runValidators: true,
        }).populate('user', 'firstName lastName email');

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: 'Merchant not found',
            });
        }

        res.status(200).json({
            success: true,
            message: `Merchant verification status updated to '${verificationStatus}'`,
            merchant,
        });
    } catch (error) {
        next(error);
    }
};
