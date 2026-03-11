import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import {
    getMejilis,
    getMejilisDashboard,
    verifyMerchantByMejilis,
    getMejilisMerchants,
    reviewCertification,
    getAllCertifications,
    fileComplaint,
    getComplaints,
    updateComplaint,
    createSession,
    getSessions,
    registerAsMerchant,
    getRegistrationStatus,
} from '../controllers/mejilisController.js';

const router = Router();

// ════════════════════════════════════════════════════════════
//  PUBLIC ROUTES
// ════════════════════════════════════════════════════════════
router.get('/', getMejilis);

// ════════════════════════════════════════════════════════════
//  AUTHENTICATED USER ROUTES
// ════════════════════════════════════════════════════════════

// Merchant Self-Registration
router.post(
    '/register-merchant',
    protect,
    [
        body('businessName').trim().notEmpty().withMessage('Business name is required'),
        body('description').trim().notEmpty().withMessage('Description is required'),
        body('businessType').notEmpty().withMessage('Business type is required'),
        body('businessPhone')
            .matches(/^(\+251|0)(9|7)\d{8}$/)
            .withMessage('Please provide a valid Ethiopian phone number'),
    ],
    validate,
    registerAsMerchant
);

// Registration status check
router.get('/registration-status', protect, getRegistrationStatus);

// File a complaint (any authenticated user)
router.post(
    '/complaints',
    protect,
    [
        body('merchantId').notEmpty().withMessage('Merchant ID is required'),
        body('category')
            .isIn([
                'halal_violation',
                'quality_issue',
                'false_advertising',
                'hygiene_concern',
                'pricing_dispute',
                'delivery_issue',
                'customer_service',
                'other',
            ])
            .withMessage('Invalid complaint category'),
        body('subject').trim().notEmpty().withMessage('Subject is required'),
        body('description').trim().notEmpty().withMessage('Description is required'),
    ],
    validate,
    fileComplaint
);

// ════════════════════════════════════════════════════════════
//  ADMIN / MEJILIS ROUTES
// ════════════════════════════════════════════════════════════

// Dashboard
router.get('/dashboard', protect, authorize('admin'), getMejilisDashboard);

// Merchants Management
router.get('/merchants', protect, authorize('admin'), getMejilisMerchants);
router.put(
    '/merchants/:id/verify',
    protect,
    authorize('admin'),
    [
        body('verificationStatus')
            .isIn(['pending', 'under_review', 'approved', 'rejected', 'suspended'])
            .withMessage('Invalid verification status'),
    ],
    validate,
    verifyMerchantByMejilis
);

// Certifications
router.get('/certifications', protect, authorize('admin'), getAllCertifications);
router.put(
    '/certifications/:id/review',
    protect,
    authorize('admin'),
    [
        body('status')
            .isIn(['pending', 'under_review', 'approved', 'rejected', 'revoked', 'suspended'])
            .withMessage('Invalid certification status'),
    ],
    validate,
    reviewCertification
);

// Complaints
router.get('/complaints', protect, authorize('admin'), getComplaints);
router.put('/complaints/:complaintId', protect, authorize('admin'), updateComplaint);

// Sessions
router.get('/sessions', protect, authorize('admin'), getSessions);
router.post(
    '/sessions',
    protect,
    authorize('admin'),
    [
        body('sessionTitle').trim().notEmpty().withMessage('Session title is required'),
        body('sessionDate').isISO8601().withMessage('Valid session date is required'),
    ],
    validate,
    createSession
);

export default router;
