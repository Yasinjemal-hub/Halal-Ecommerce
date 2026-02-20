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

// ── Consumer Routes ─────────────────────────────────────
router.post(
    '/',
    [
        body('shippingAddress.fullName')
            .trim()
            .notEmpty()
            .withMessage('Full name is required'),
        body('shippingAddress.phone')
            .matches(/^(\+251|0)(9|7)\d{8}$/)
            .withMessage('Please provide a valid Ethiopian phone number'),
        body('paymentMethod')
            .isIn(['telebirr', 'cbe_birr', 'cash_on_delivery', 'bank_transfer', 'amole'])
            .withMessage('Invalid payment method'),
    ],
    validate,
    createOrder
);

router.get('/my-orders', getMyOrders);
router.get('/:id', getOrder);
router.put('/:id/cancel', cancelOrder);

// ── Merchant Routes ─────────────────────────────────────
router.get('/merchant/orders', authorize('merchant', 'admin'), getMerchantOrders);

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
