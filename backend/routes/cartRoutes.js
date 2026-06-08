import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import {
    getCart,
    addToCart,
    updateCartItem,
    removeFromCart,
    clearCart,
} from '../controllers/cartController.js';

const router = Router();

// All cart routes require authentication
router.use(protect);

// Development-only request logger to aid debugging of frontend payloads
if (process.env.NODE_ENV !== 'production') {
    router.use((req, res, next) => {
        if (req.path.startsWith('/') && ['POST', 'PUT', 'DELETE'].includes(req.method)) {
            try {
                console.debug('[cartRoutes] Incoming', req.method, req.originalUrl, 'body=', JSON.stringify(req.body));
            } catch (e) {
                console.debug('[cartRoutes] Incoming', req.method, req.originalUrl, 'body=', req.body);
            }
        }
        next();
    });
}

// ── Get Cart ────────────────────────────────────────────
router.get('/', getCart);

// ── Add to Cart ─────────────────────────────────────────
router.post(
    '/',
    [
        body('productId')
            .notEmpty()
            .withMessage('Product ID is required')
            .isMongoId()
            .withMessage('Invalid product ID'),
        body('quantity')
            .optional()
            .isInt({ min: 1, max: 999 })
            .withMessage('Quantity must be between 1 and 999'),
    ],
    validate,
    addToCart
);

// ── Update Cart Item ────────────────────────────────────
router.put(
    '/:itemId',
    [
        body('quantity')
            .isInt({ min: 1, max: 999 })
            .withMessage('Quantity must be between 1 and 999'),
    ],
    validate,
    updateCartItem
);

// ── Remove Item from Cart ───────────────────────────────
router.delete('/:itemId', removeFromCart);

// ── Clear Cart ──────────────────────────────────────────
router.delete('/', clearCart);

export default router;
