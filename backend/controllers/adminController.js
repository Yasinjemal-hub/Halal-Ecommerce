import User from '../models/User.js';
import Merchant from '../models/Merchant.js';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import Certification from '../models/Certification.js';
import { safeUserResponse, safeMerchantResponse, safeCertificationResponse } from '../utils/safeResponse.js';
import {
    decideMerchantVerification,
    VerificationValidationError,
} from '../utils/merchantVerification.js';
import {
    getRequestedFields,
    genuinePendingMatch,
    isGenuinePendingRequest,
    validateRequestedValue,
} from '../utils/profileUpdates.js';

const ADMIN_USER_ROLES = ['consumer', 'merchant', 'admin', 'superadmin'];
const ADMIN_USER_SORTS = ['newest', 'oldest', 'name', 'email'];
const ADMIN_USER_STATUSES = ['all', 'active', 'inactive'];
const ADMIN_ACCOUNT_SOURCES = ['regular', 'demo', 'test'];
const ADMIN_USERS_MAX_LIMIT = 100;
const ADMIN_SEARCH_MAX_LENGTH = 100;

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * @desc    Get all users (server-side search, filter, sort & pagination)
 * @route   GET /api/admin/users
 * @access  Admin
 * @note    All filtering happens on the server with bounded pagination.
 *          Demo consumers are ordinary development data and appear in the
 *          normal listing; only test fixtures (explicit accountSource
 *          'test') stay excluded. Production never exposes demo/test
 *          accounts, regardless of query parameters. Never filter by
 *          email patterns or names.
 */
export const getAllUsers = async (req, res, next) => {
    try {
        // ── Validate pagination ──
        let page = 1;
        if (req.query.page !== undefined) {
            page = Number(req.query.page);
            if (!Number.isInteger(page) || page < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid page. Must be a positive integer.',
                });
            }
        }
        let limit = 20;
        if (req.query.limit !== undefined) {
            limit = Number(req.query.limit);
            if (!Number.isInteger(limit) || limit < 1 || limit > ADMIN_USERS_MAX_LIMIT) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid limit. Must be an integer between 1 and ${ADMIN_USERS_MAX_LIMIT}.`,
                });
            }
        }
        const skip = (page - 1) * limit;

        // ── Validate role ──
        let role;
        if (req.query.role !== undefined && req.query.role !== '') {
            role = String(req.query.role);
            if (!ADMIN_USER_ROLES.includes(role)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid role. Must be one of: ${ADMIN_USER_ROLES.join(', ')}.`,
                });
            }
        }

        // ── Validate status (supports `status` and legacy `isActive`) ──
        let status = 'all';
        if (req.query.status !== undefined && req.query.status !== '') {
            status = String(req.query.status);
            if (!ADMIN_USER_STATUSES.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status. Must be one of: ${ADMIN_USER_STATUSES.join(', ')}.`,
                });
            }
        } else if (req.query.isActive !== undefined && req.query.isActive !== '') {
            const raw = String(req.query.isActive);
            if (raw !== 'true' && raw !== 'false') {
                return res.status(400).json({
                    success: false,
                    message: "Invalid isActive. Must be 'true' or 'false'.",
                });
            }
            status = raw === 'true' ? 'active' : 'inactive';
        }

        // ── Validate sort ──
        let sortKey = 'newest';
        if (req.query.sort !== undefined && req.query.sort !== '') {
            sortKey = String(req.query.sort);
            if (!ADMIN_USER_SORTS.includes(sortKey)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid sort. Must be one of: ${ADMIN_USER_SORTS.join(', ')}.`,
                });
            }
        }
        const sort =
            sortKey === 'oldest'
                ? { createdAt: 1 }
                : sortKey === 'name'
                  ? { firstName: 1, lastName: 1, createdAt: -1 }
                  : sortKey === 'email'
                    ? { email: 1 }
                    : { createdAt: -1 };

        // ── Validate search ──
        let searchOr = null;
        if (req.query.search !== undefined && String(req.query.search).trim() !== '') {
            const q = String(req.query.search).trim();
            if (q.length > ADMIN_SEARCH_MAX_LENGTH) {
                return res.status(400).json({
                    success: false,
                    message: `Search is too long. Maximum ${ADMIN_SEARCH_MAX_LENGTH} characters.`,
                });
            }
            const safe = escapeRegExp(q);
            searchOr = [
                { firstName: { $regex: safe, $options: 'i' } },
                { lastName: { $regex: safe, $options: 'i' } },
                { email: { $regex: safe, $options: 'i' } },
                { phone: { $regex: safe, $options: 'i' } },
            ];
        }

        // ── Provenance visibility (explicit marker only) ──
        // Production never exposes demo/test accounts, no matter what
        // query parameters are sent. Outside production, demo accounts
        // are ordinary development data and are included in the normal
        // listing, search, filters, and counts; only test fixtures
        // (accountSource 'test') stay excluded. Records without a marker
        // (legacy) are treated as regular everywhere.
        const isProduction = process.env.NODE_ENV === 'production';
        let accountSourceFilter = null;
        if (isProduction) {
            accountSourceFilter = { accountSource: { $nin: ['demo', 'test'] } };
        } else if (req.query.accountSource !== undefined && req.query.accountSource !== '') {
            const src = String(req.query.accountSource);
            if (!ADMIN_ACCOUNT_SOURCES.includes(src)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid accountSource. Must be one of: ${ADMIN_ACCOUNT_SOURCES.join(', ')}.`,
                });
            }
            accountSourceFilter = { accountSource: src };
        } else if (String(req.query.includeDemo || '') === 'false') {
            // Explicit opt-out (backward compatible): hide demo accounts
            // but still show regular ones alongside test-fixture exclusion.
            accountSourceFilter = { accountSource: { $nin: ['demo', 'test'] } };
        } else {
            accountSourceFilter = { accountSource: { $ne: 'test' } };
        }

        // Base filter (role + search + provenance) used for stats so the
        // UI can show accurate totals independent of the status filter.
        const baseFilter = {};
        if (role) baseFilter.role = role;
        if (searchOr) baseFilter.$or = searchOr;
        if (accountSourceFilter) Object.assign(baseFilter, accountSourceFilter);

        const filter = { ...baseFilter };
        if (status === 'active') filter.isActive = true;
        if (status === 'inactive') filter.isActive = false;

        const [users, total, activeCount, inactiveCount, pendingCount] = await Promise.all([
            User.find(filter).skip(skip).limit(limit).sort(sort),
            User.countDocuments(filter),
            User.countDocuments({ ...baseFilter, isActive: true }),
            User.countDocuments({ ...baseFilter, isActive: false }),
            // $and: baseFilter may carry its own $or (search), which a
            // spread would clobber.
            User.countDocuments({ $and: [baseFilter, genuinePendingMatch()] }),
        ]);

        res.status(200).json({
            success: true,
            count: users.length,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
            currentPage: page,
            limit,
            users: users.map((u) => safeUserResponse.admin(u)),
            stats: {
                total: activeCount + inactiveCount,
                active: activeCount,
                inactive: inactiveCount,
                pendingUpdates: pendingCount,
            },
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get a single user (consumer detail for Customers Management)
 * @route   GET /api/admin/users/:id
 * @access  Admin
 * @note    Returns admin-safe account fields plus a concise order summary
 *          and recent orders. Never returns passwords, tokens, or
 *          reset/verification secrets.
 */
export const getUserById = async (req, res, next) => {
    try {
        const { id } = req.params;
        if (!id || !String(id).match(/^[a-fA-F0-9]{24}$/)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user id.',
            });
        }

        const user = await User.findById(id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
            });
        }

        // Concise order summary (read-only; Order API is the source of truth)
        let orderSummary = { totalOrders: 0, totalSpent: 0, recentOrders: [] };
        try {
            const [totalOrders, spentAgg, recent] = await Promise.all([
                Order.countDocuments({ user: user._id }),
                Order.aggregate([
                    { $match: { user: user._id } },
                    { $group: { _id: null, total: { $sum: '$totalPrice' } } },
                ]),
                Order.find({ user: user._id })
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .select('_id orderNumber status paymentStatus totalPrice createdAt items'),
            ]);
            orderSummary = {
                totalOrders,
                totalSpent: spentAgg.length > 0 ? spentAgg[0].total : 0,
                recentOrders: recent.map((o) => ({
                    _id: o._id,
                    orderNumber: o.orderNumber,
                    status: o.status,
                    paymentStatus: o.paymentStatus,
                    totalPrice: o.totalPrice,
                    createdAt: o.createdAt,
                    itemCount: (o.items || []).reduce((n, i) => n + (i.quantity || 0), 0),
                })),
            };
        } catch {
            // Order summary is best-effort; account detail still returns.
        }

        res.status(200).json({
            success: true,
            user: safeUserResponse.admin(user),
            orderSummary,
        });
    } catch (error) {
        next(error);
    }
};

export const getPendingProfileUpdates = async (req, res, next) => {
    try {
        // Server-side pagination so the queue stays usable as it grows.
        let page = 1;
        if (req.query.page !== undefined) {
            page = Number(req.query.page);
            if (!Number.isInteger(page) || page < 1) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid page. Must be a positive integer.',
                });
            }
        }
        let limit = 20;
        if (req.query.limit !== undefined) {
            limit = Number(req.query.limit);
            if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid limit. Must be an integer between 1 and 100.',
                });
            }
        }
        const skip = (page - 1) * limit;

        // Genuine requests only: status + request date + ≥1 real field.
        // Empty auto-defaulted objects and malformed records never qualify
        // (see utils/profileUpdates.js) — they are neither shown nor
        // decidable, and legitimate requests are never filtered out.
        const filter = genuinePendingMatch();
        const [users, total] = await Promise.all([
            User.find(filter)
                .sort({ 'pendingProfileUpdate.requestedAt': 1 })
                .skip(skip)
                .limit(limit),
            User.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            count: users.length,
            total,
            totalPages: total === 0 ? 0 : Math.ceil(total / limit),
            currentPage: page,
            limit,
            users: users.map((u) => safeUserResponse.admin(u)),
        });
    } catch (error) {
        next(error);
    }
};

export const approveUserProfileUpdate = async (req, res, next) => {
    try {
        const { action, reviewNotes, expectedRequestedAt } = req.body;
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

        // Only genuine requests are decidable: empty auto-defaulted or
        // malformed records can never be approved or rejected.
        if (!isGenuinePendingRequest(pending)) {
            return res.status(400).json({
                success: false,
                message: 'This request has no reviewable changes and cannot be decided.',
            });
        }

        // Stale-decision guard: when the reviewer loaded an older request
        // (e.g. the user resubmitted, or another admin already decided),
        // refuse instead of applying twice or overwriting newer data.
        if (expectedRequestedAt !== undefined && expectedRequestedAt !== null && expectedRequestedAt !== '') {
            const expected = new Date(expectedRequestedAt).getTime();
            const actual = pending.requestedAt ? new Date(pending.requestedAt).getTime() : NaN;
            if (Number.isNaN(expected) || Number.isNaN(actual) || expected !== actual) {
                return res.status(409).json({
                    success: false,
                    message: 'This request changed since you loaded it. Reload the queue and review the latest request.',
                });
            }
        }

        // Re-validate every requested field at decision time; malformed
        // values fail the decision with a clear message and change nothing.
        const requestedFields = getRequestedFields(pending);
        for (const field of requestedFields) {
            const fieldError = validateRequestedValue(field, pending[field]);
            if (fieldError) {
                return res.status(400).json({
                    success: false,
                    message: fieldError,
                });
            }
        }

        if (normalizedAction === 'approved') {
            const updateData = {};
            if (pending.firstName) updateData.firstName = String(pending.firstName).trim();
            if (pending.lastName) updateData.lastName = String(pending.lastName).trim();
            if (pending.email) {
                // Email uniqueness is rechecked at approval time: another
                // account may have taken the address after the request.
                const normalizedEmail = String(pending.email).trim().toLowerCase();
                const existingUser = await User.findOne({
                    email: normalizedEmail,
                    _id: { $ne: user._id },
                });
                if (existingUser) {
                    return res.status(400).json({
                        success: false,
                        message: 'Requested email is already in use by another account.',
                    });
                }
                updateData.email = normalizedEmail;
            }
            if (pending.phone) updateData.phone = String(pending.phone).trim();

            Object.assign(user, updateData);
            user.pendingProfileUpdate = {
                ...pending.toObject ? pending.toObject() : { ...pending },
                status: 'approved',
                reviewedAt: new Date(),
                reviewedBy: req.user._id,
                reviewNotes,
            };
        } else {
            user.pendingProfileUpdate = {
                ...pending.toObject ? pending.toObject() : { ...pending },
                status: 'rejected',
                reviewedAt: new Date(),
                reviewedBy: req.user._id,
                reviewNotes,
            };
        }

        await user.save();

        res.status(200).json({
            success: true,
            user: safeUserResponse.admin(user),
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
            user: safeUserResponse.admin(user),
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Toggle user active status (consumer accounts only)
 * @route   PUT /api/admin/users/:id/status
 * @access  Admin
 * @note    This customer control is restricted to eligible consumer
 *          accounts. It refuses privileged roles and self-deactivation so
 *          admins cannot lock themselves (or merchants/admins) out through
 *          the Customers Management UI. Deactivation clears the stored
 *          refresh token so the session cannot be refreshed; the auth
 *          middleware and login/refresh flows already reject inactive
 *          accounts, and reactivation restores access.
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

        if (user.role !== 'consumer') {
            return res.status(403).json({
                success: false,
                message: 'This control manages consumer accounts only.',
            });
        }

        if (req.user && req.user._id && req.user._id.toString() === user._id.toString()) {
            return res.status(403).json({
                success: false,
                message: 'You cannot change your own account status.',
            });
        }

        if (['admin', 'superadmin'].includes(user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Privileged accounts cannot be changed through this control.',
            });
        }

        user.isActive = !user.isActive;
        if (!user.isActive) {
            // Force session invalidation: the hashed refresh token is
            // cleared so existing refresh flows fail closed. Access tokens
            // expire naturally (short-lived) and `protect` rejects
            // inactive accounts on every request.
            user.refreshToken = undefined;
            user.refreshTokenExpires = undefined;
        }
        await user.save();

        res.status(200).json({
            success: true,
            message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
            user: safeUserResponse.admin(user),
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
        // ── Definitions (every figure is a live database count) ──
        // totalMerchants:      all merchant profiles ever created
        // approvedMerchants:   verificationStatus === 'approved' (also halal
        //                      certified under the one-approval rule — each
        //                      approval issues exactly one certificate)
        // activeMerchants:     approved AND account active (isActive) — merchants actually trading
        // needsReviewMerchants: pending + under_review — the actionable review queue
        // totalRevenue:        sum of order totals with paymentStatus 'paid' (captured payments only)
        // issuedCertifications: certifications with status 'approved' (issued
        //                      automatically with business approval)
        const [
            totalUsers,
            totalMerchants,
            approvedMerchants,
            activeMerchants,
            pendingMerchants,
            underReviewMerchants,
            totalProducts,
            totalOrders,
            pendingCertifications,
            issuedCertifications,
        ] = await Promise.all([
            User.countDocuments(),
            Merchant.countDocuments(),
            Merchant.countDocuments({ verificationStatus: 'approved' }),
            Merchant.countDocuments({ verificationStatus: 'approved', isActive: true }),
            Merchant.countDocuments({ verificationStatus: 'pending' }),
            Merchant.countDocuments({ verificationStatus: 'under_review' }),
            Product.countDocuments(),
            Order.countDocuments(),
            Certification.countDocuments({ status: 'pending' }),
            Certification.countDocuments({ status: 'approved' }),
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

        // Transform recent orders to include safe user data
        const safeRecentOrders = recentOrders.map((order) => ({
            ...order.toObject(),
            user: order.user ? safeUserResponse.admin(order.user) : null,
        }));

        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                totalMerchants,
                approvedMerchants,
                activeMerchants,
                pendingMerchants,
                underReviewMerchants,
                needsReviewMerchants: pendingMerchants + underReviewMerchants,
                totalProducts,
                totalOrders,
                totalRevenue,
                pendingCertifications,
                issuedCertifications,
            },
            recentOrders: safeRecentOrders,
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
        const limit = Math.min(parseInt(req.query.limit) || 20, 100);
        const skip = (page - 1) * limit;

        const filter = {};
        if (req.query.verificationStatus) {
            // Accept a single status or a comma-separated set
            // (e.g. ?verificationStatus=pending,under_review for the review queue).
            const requested = String(req.query.verificationStatus)
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean);
            const valid = ['pending', 'under_review', 'approved', 'rejected', 'suspended'];
            const invalid = requested.filter((s) => !valid.includes(s));
            if (invalid.length > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid verification status: ${invalid.join(', ')}. Must be one of: ${valid.join(', ')}`,
                });
            }
            filter.verificationStatus = requested.length === 1 ? requested[0] : { $in: requested };
        }
        if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
        if (req.query.businessType) filter.businessType = req.query.businessType;
        if (req.query.search) {
            const q = req.query.search.trim();
            filter.$or = [
                { businessName: { $regex: q, $options: 'i' } },
                { businessEmail: { $regex: q, $options: 'i' } },
                { businessPhone: { $regex: q, $options: 'i' } },
            ];
        }

        let sort = { createdAt: -1 };
        if (req.query.sort === 'oldest') sort = { createdAt: 1 };
        if (req.query.sort === 'name') sort = { businessName: 1 };

        const [merchants, total, statusCounts] = await Promise.all([
            Merchant.find(filter)
                .populate('user', 'firstName lastName email phone')
                .skip(skip)
                .limit(limit)
                .sort(sort),
            Merchant.countDocuments(filter),
            Merchant.aggregate([
                { $group: { _id: '$verificationStatus', count: { $sum: 1 } } },
            ]),
        ]);

        const counts = { pending: 0, under_review: 0, approved: 0, rejected: 0, suspended: 0 };
        for (const row of statusCounts) {
            if (row._id in counts) counts[row._id] = row.count;
        }

        res.status(200).json({
            success: true,
            count: merchants.length,
            total,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            statusCounts: counts,
            // List view intentionally excludes identity/business documents —
            // load those via GET /api/admin/merchants/:id only.
            merchants: merchants.map((m) => safeMerchantResponse.adminList(m)),
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get a single merchant application (admin detail incl. documents)
 * @route   GET /api/admin/merchants/:id
 * @access  Admin
 * @note    This authenticated admin endpoint is the ONLY list-adjacent way
 *          to load identity/business documents (governmentLicense,
 *          nationalId). Public responses never include them.
 */
export const getMerchantById = async (req, res, next) => {
    try {
        const merchant = await Merchant.findById(req.params.id)
            .populate('user', 'firstName lastName email phone avatar')
            // Full certification evidence for the unified Majlis review
            // (admin-only endpoint; public responses never include these).
            .populate('halalCertification', 'certificateNumber issuingAuthority certificateType status applicationDate issueDate expiryDate scope coveredProducts documents +reviewNotes +rejectionReason +revocationReason')
            .populate('verifiedBy', 'firstName lastName');

        if (!merchant) {
            return res.status(404).json({
                success: false,
                message: 'Merchant not found',
            });
        }

        res.status(200).json({
            success: true,
            merchant: safeMerchantResponse.admin(merchant),
        });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Verify / update merchant verification status
 * @route   PUT /api/admin/merchants/:id/verify
 * @access  Admin
 * @note    Single review decision (product rule): approving the business
 *          also approves it as halal certified and issues the certificate
 *          automatically. Legacy `certification` payloads are ignored.
 */
export const verifyMerchant = async (req, res, next) => {
    try {
        const { verificationStatus, verificationNotes, rejectionReason } = req.body;

        const merchant = await decideMerchantVerification(req.params.id, {
            verificationStatus,
            verificationNotes,
            rejectionReason,
            reviewerId: req.user._id,
        });
        const populated = await Merchant.findById(merchant._id).populate('halalCertification');
        const certificationDoc = populated?.halalCertification && typeof populated.halalCertification === 'object'
            ? populated.halalCertification
            : null;

        res.status(200).json({
            success: true,
            message: verificationStatus === 'approved'
                ? `Merchant '${populated.businessName}' approved and halal certified (certificate ${certificationDoc?.certificateNumber || 'issued'}).`
                : `Merchant verification status updated to '${verificationStatus}'`,
            merchant: safeMerchantResponse.admin(populated),
            certification: certificationDoc ? safeCertificationResponse.admin(certificationDoc) : null,
        });
    } catch (error) {
        if (error instanceof VerificationValidationError) {
            return res.status(error.statusCode).json({
                success: false,
                message: error.message,
            });
        }
        if (error.statusCode === 404 || error.statusCode === 403) {
            return res.status(error.statusCode).json({ success: false, message: error.message });
        }
        next(error);
    }
};
