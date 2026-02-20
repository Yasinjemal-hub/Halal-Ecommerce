import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import {
    createMerchant,
    getMerchant,
    updateMerchant,
    getMerchantProducts,
    applyForCertification,
    getMyMerchantProfile,
} from '../controllers/merchantController.js';

const router = Router();

// ── Public Routes ───────────────────────────────────────
router.get('/:id/products', getMerchantProducts);
router.get('/:id', getMerchant);

// ── Protected Routes ────────────────────────────────────
router.get('/me/profile', protect, authorize('merchant'), getMyMerchantProfile);

router.post(
    '/',
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
    createMerchant
);

router.put(
    '/:id',
    protect,
    authorize('merchant', 'admin'),
    updateMerchant
);

// ── Certification Application ───────────────────────────
router.post(
    '/:id/certifications',
    protect,
    authorize('merchant'),
    [
        body('certificateType')
            .isIn(['halal_product', 'halal_establishment', 'halal_slaughter', 'halal_import'])
            .withMessage('Invalid certificate type'),
    ],
    validate,
    applyForCertification
);

export default router;
