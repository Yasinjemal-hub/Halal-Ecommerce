import { Router } from 'express';
import { body } from 'express-validator';
import validate from '../middleware/validate.js';
import { protect } from '../middleware/auth.js';
import { authorize } from '../middleware/roleCheck.js';
import {
    createProduct,
    getAllProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    searchProducts,
    approveProduct,
} from '../controllers/productController.js';

const router = Router();

// ── Public Routes ───────────────────────────────────────
router.get('/search', searchProducts);
router.get('/', getAllProducts);
router.get('/:id', getProduct);

// ── Merchant Routes ─────────────────────────────────────
router.post(
    '/',
    protect,
    authorize('merchant', 'admin'),
    [
        body('name').trim().notEmpty().withMessage('Product name is required'),
        body('description').trim().notEmpty().withMessage('Description is required'),
        body('price')
            .isFloat({ min: 0 })
            .withMessage('Price must be a positive number'),
        body('category').notEmpty().withMessage('Category is required'),
        body('stock')
            .isInt({ min: 0 })
            .withMessage('Stock must be a non-negative integer'),
    ],
    validate,
    createProduct
);

router.put(
    '/:id',
    protect,
    authorize('merchant', 'admin'),
    updateProduct
);

router.delete(
    '/:id',
    protect,
    authorize('merchant', 'admin'),
    deleteProduct
);

// ── Admin Routes ────────────────────────────────────────
router.put(
    '/:id/approve',
    protect,
    authorize('admin'),
    approveProduct
);

export default router;
