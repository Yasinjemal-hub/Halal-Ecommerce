import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import {
    getAllUsers,
    getUserById,
    getPendingProfileUpdates,
    approveUserProfileUpdate,
    updateUserRole,
    toggleUserStatus,
    getDashboardStats,
    getAllMerchants,
    getMerchantById,
    verifyMerchant,
} from '../controllers/adminController.js';
import { MERCHANT_VERIFICATION_STATUSES } from '../utils/merchantVerification.js';

const router = Router();

// All admin routes require authentication + admin role
router.use(protect, authorize('admin', 'superadmin'));

// ── Dashboard ───────────────────────────────────────────
router.get('/dashboard', getDashboardStats);

// ── Users ───────────────────────────────────────────────
router.get('/users', getAllUsers);
// NOTE: specific paths before the `/:id` detail route so
// 'pending-updates' is never captured as an id.
router.get('/users/pending-updates', getPendingProfileUpdates);
router.get('/users/:id', getUserById);
router.put(
    '/users/:id/profile-approval',
    [
        body('action')
            .isIn(['approve', 'approved', 'reject', 'rejected'])
            .withMessage("Action must be 'approved' or 'rejected'."),
        body('reviewNotes')
            .optional({ values: 'falsy' })
            .isString()
            .withMessage('Review notes must be a string'),
        body('expectedRequestedAt')
            .optional({ values: 'falsy' })
            .isISO8601()
            .withMessage('Expected request date must be a valid ISO-8601 date'),
    ],
    validate,
    approveUserProfileUpdate
);
router.put('/users/:id/role', updateUserRole);
router.put('/users/:id/status', toggleUserStatus);

// ── Merchants ───────────────────────────────────────────
// NOTE: specific path before wildcard-ish verify path is not required
// (different methods), but detail MUST precede any future GET /:id routes.
router.get('/merchants', getAllMerchants);
router.get('/merchants/:id', getMerchantById);
router.put(
    '/merchants/:id/verify',
    [
        body('verificationStatus')
            .isIn(MERCHANT_VERIFICATION_STATUSES)
            .withMessage(
                `Invalid verification status. Must be one of: ${MERCHANT_VERIFICATION_STATUSES.join(', ')}`
            ),
        body('rejectionReason')
            .optional()
            .isString()
            .withMessage('Rejection reason must be a string'),
        body('verificationNotes')
            .optional()
            .isString()
            .withMessage('Reviewer notes must be a string'),
        // Retired: a separate certification decision no longer exists.
        // A legacy `certification` object is ignored when present.
        body('certification')
            .optional()
            .isObject()
            .withMessage('Certification decision must be an object'),
    ],
    validate,
    verifyMerchant
);

export default router;
