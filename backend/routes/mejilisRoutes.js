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
    getCertificationById,
    fileComplaint,
    getComplaints,
    updateComplaint,
    createSession,
    getSessions,
    registerAsMerchant,
    getRegistrationStatus,
    updateRegistration,
    downloadCertificatePdf,
    verifyCertificatePublic,
} from '../controllers/mejilisController.js';

const router = Router();

// ════════════════════════════════════════════════════════════
//  PUBLIC ROUTES
// ════════════════════════════════════════════════════════════
router.get('/', getMejilis);

// Public certificate verification (public facts only — no documents,
// no reviewer notes, no contact details)
router.get('/certifications/verify/:certificateNumber', verifyCertificatePublic);

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
        body('governmentLicense.url')
            .optional()
            .isString()
            .withMessage('Government license image URL must be a string'),
        body('nationalId.url')
            .optional()
            .isString()
            .withMessage('National ID image URL must be a string'),
        // Retired: separate certification evidence is no longer accepted.
        // A legacy `certification` object is ignored when present so old
        // clients do not break; approval issues the certificate automatically.
        body('certification')
            .optional()
            .isObject()
            .withMessage('Certification evidence must be an object'),
    ],
    validate,
    registerAsMerchant
);

// Registration status check
router.get('/registration-status', protect, getRegistrationStatus);

// Update / resubmit own application (rejected → pending; pending /
// under_review → in-place edit; approved / suspended → 403)
router.put(
    '/registration',
    protect,
    [
        body('businessName').optional().trim().notEmpty().withMessage('Business name cannot be empty'),
        body('description').optional().trim().notEmpty().withMessage('Description cannot be empty'),
        body('businessType')
            .optional()
            .isIn([
                'restaurant', 'grocery', 'butcher', 'bakery', 'wholesale',
                'cosmetics', 'clothing', 'spice_shop', 'supermarket', 'other',
            ])
            .withMessage('Invalid business type'),
        body('certification')
            .optional()
            .isObject()
            .withMessage('Certification evidence must be an object'),
        body('businessPhone')
            .optional()
            .matches(/^(\+251|0)(9|7)\d{8}$/)
            .withMessage('Please provide a valid Ethiopian phone number'),
    ],
    validate,
    updateRegistration
);

// Download own issued certificate as PDF (eligibility enforced server-side)
router.get('/certificate/pdf', protect, downloadCertificatePdf);

// File a complaint (any authenticated user)
router.post(
    '/complaints',
    protect,
    [
        body('merchantIdentifier').notEmpty().withMessage('Merchant email or business name is required'),
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
        body('evidence')
            .optional()
            .isArray()
            .withMessage('Evidence must be an array of images'),
    ],
    validate,
    fileComplaint
);

// ════════════════════════════════════════════════════════════
//  ADMIN / MEJILIS ROUTES
// ════════════════════════════════════════════════════════════

// Dashboard
router.get('/dashboard', protect, authorize('admin', 'superadmin'), getMejilisDashboard);

// Merchants Management
router.get('/merchants', protect, authorize('admin', 'superadmin'), getMejilisMerchants);
router.put(
    '/merchants/:id/verify',
    protect,
    authorize('admin', 'superadmin'),
    [
        body('verificationStatus')
            .isIn(['pending', 'under_review', 'approved', 'rejected', 'suspended'])
            .withMessage('Invalid verification status'),
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
    verifyMerchantByMejilis
);

// Certifications (read-only issued records + public verification).
// The separate review endpoint is retired (HTTP 410) — business approval
// issues the certificate automatically.
router.get('/certifications', protect, authorize('admin', 'superadmin'), getAllCertifications);
router.get('/certifications/:id', protect, authorize('admin', 'superadmin'), getCertificationById);
router.put('/certifications/:id/review', protect, authorize('admin', 'superadmin'), reviewCertification);

// Complaints
router.get('/complaints', protect, authorize('admin', 'superadmin'), getComplaints);
router.put('/complaints/:complaintId', protect, authorize('admin', 'superadmin'), updateComplaint);

// Sessions
router.get('/sessions', protect, authorize('admin', 'superadmin'), getSessions);
router.post(
    '/sessions',
    protect,
    authorize('admin', 'superadmin'),
    [
        body('sessionTitle').trim().notEmpty().withMessage('Session title is required'),
        body('sessionDate').isISO8601().withMessage('Valid session date is required'),
    ],
    validate,
    createSession
);

export default router;
