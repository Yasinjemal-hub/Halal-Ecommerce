import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import {
    createOrder,
    getMyOrders,
    getOrder,
    updateOrderStatus,
    cancelOrder,
    getMerchantOrders,
} from '../controllers/orderController.js';

const router = Router();

// All order routes require authentication
router.use(protect);

// Normalize order body to accept either nested `shippingAddress` or flat shipping fields
const normalizeShipping = (req, res, next) => {
    if (!req.body.shippingAddress) {
        const {
            fullName,
            phone,
            street,
            city,
            region,
            postalCode,
        } = req.body;

        if (fullName || phone || street || city || region || postalCode) {
            // sanitize phone (remove spaces and dashes)
            const cleanedPhone = phone ? String(phone).replace(/[\s-()]/g, '') : '';

            req.body.shippingAddress = {
                fullName: fullName || '',
                phone: cleanedPhone || '',
                street: street || '',
                city: city || '',
                region: region || '',
                postalCode: postalCode || '',
            };
        }
    }

    next();
};

// Normalize payment method synonyms to canonical values
const normalizePaymentMethod = (req, res, next) => {
    if (req.body.paymentMethod && typeof req.body.paymentMethod === 'string') {
        const pm = req.body.paymentMethod.toLowerCase();
        const map = {
            cod: 'cash_on_delivery',
            cash: 'cash_on_delivery',
            'cash-on-delivery': 'cash_on_delivery',
            cbe: 'cbe_birr',
            'cbe-birr': 'cbe_birr',
            telebirr: 'telebirr',
            amole: 'amole',
            bank: 'bank_transfer',
            'bank-transfer': 'bank_transfer',
        };

        if (map[pm]) req.body.paymentMethod = map[pm];
    }

    next();
};

// ── Consumer Routes ─────────────────────────────────────
router.post(
    '/',
    normalizeShipping,
    normalizePaymentMethod,
    [
        body('shippingAddress.fullName')
            .trim()
            .notEmpty()
            .withMessage('Full name is required'),
        body('shippingAddress.phone')
            .custom((val, { req }) => {
                const v = String(val || '').replace(/[\s-()]/g, '');
                // Accept numbers like +2519XXXXXXXX or 09XXXXXXXX
                if (/^(?:\+251|0)([79]\d{8})$/.test(v)) {
                    // store cleaned phone back to request body
                    req.body.shippingAddress.phone = v;
                    return true;
                }
                throw new Error('Please provide a valid Ethiopian phone number');
            }),
        body('shippingAddress.street')
            .optional()
            .trim(),
        body('shippingAddress.city')
            .trim()
            .notEmpty()
            .withMessage('City is required'),
        body('shippingAddress.region')
            .trim()
            .notEmpty()
            .withMessage('Region is required'),
        body('shippingAddress.postalCode')
            .optional()
            .trim(),
        body('paymentMethod')
            .isIn(['telebirr', 'cbe_birr', 'cash_on_delivery', 'bank_transfer', 'amole'])
            .withMessage('Invalid payment method'),
        body('deliveryFee')
            .optional()
            .isFloat({min: 0, max: 10000})
            .withMessage('Delivery fee must be between 0 and 10000'),
        body('discount')
            .optional()
            .isFloat({min: 0})
            .withMessage('Discount must be a positive number'),
    ],
    validate,
    createOrder
);

router.get('/my-orders', getMyOrders);

// Merchant route must come before /:id wildcard
router.get('/merchant/orders', authorize('merchant', 'admin'), getMerchantOrders);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);

// ── Admin / Merchant Status Update ──────────────────────
router.put(
    '/:id/status',
    authorize('merchant', 'admin'),
    [
        body('status')
            .isIn([
                'pending',
                'confirmed',
                'processing',
                'shipped',
                'out_for_delivery',
                'delivered',
                'cancelled',
                'refunded',
                'return_requested',
                'returned',
            ])
            .withMessage('Invalid order status'),
    ],
    validate,
    updateOrderStatus
);

export default router;
