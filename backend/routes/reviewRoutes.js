import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { createReview, getProductReviews } from '../controllers/reviewController.js';

const router = Router();

router.post('/', protect, createReview);
router.get('/product/:id', getProductReviews);

export default router;
