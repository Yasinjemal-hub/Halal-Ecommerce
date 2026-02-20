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
            .isInt({ min: 1 })
            .withMessage('Quantity must be at least 1'),
    ],
    validate,
    addToCart
);

// ── Update Cart Item ────────────────────────────────────
router.put(
    '/:itemId',
    [
        body('quantity')
            .isInt({ min: 1 })
            .withMessage('Quantity must be at least 1'),
    ],
    validate,
    updateCartItem
);

// ── Remove Item from Cart ───────────────────────────────
router.delete('/:itemId', removeFromCart);

// ── Clear Cart ──────────────────────────────────────────
router.delete('/', clearCart);

export default router;
