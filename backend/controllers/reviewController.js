import Review from '../models/Review.js';
import Order from '../models/Order.js';
import mongoose from 'mongoose';

/**
 * @desc    Create a product or merchant review
 * @route   POST /api/reviews
 * @access  Private
 */
export const createReview = async (req, res, next) => {
    try {
        const { reviewType, product, merchant, rating, title, comment, orderRef } = req.body;

        if (!reviewType || (reviewType === 'product' && !product) || (reviewType === 'merchant' && !merchant)) {
            return res.status(400).json({ success: false, message: 'Invalid review target' });
        }

        if (!rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
        }

        // If product or merchant review, verify delivery and purchase
        let isVerifiedPurchase = false;
        if (reviewType === 'product' || reviewType === 'merchant') {
            if (!orderRef) {
                return res.status(400).json({ success: false, message: 'orderRef is required for reviews' });
            }

            const order = await Order.findById(orderRef);
            if (!order || order.user.toString() !== req.user._id.toString()) {
                return res.status(400).json({ success: false, message: 'Order not found for user' });
            }

            if (order.status !== 'delivered') {
                return res.status(400).json({ success: false, message: 'You can only review after delivery' });
            }

            if (reviewType === 'product') {
                const found = order.items.some((it) => it.product?.toString() === product);
                if (!found) {
                    return res.status(400).json({ success: false, message: 'Product not found in the referenced order' });
                }
            }

            if (reviewType === 'merchant') {
                const foundMerchant = order.items.some((it) => it.merchant?.toString() === merchant);
                if (!foundMerchant) {
                    return res.status(400).json({ success: false, message: 'Merchant not found in the referenced order' });
                }
            }

            isVerifiedPurchase = true;
        }

        const reviewData = {
            user: req.user._id,
            reviewType,
            rating,
            title,
            comment,
            isVerifiedPurchase,
            orderRef: orderRef || null,
        };
        if (product) reviewData.product = product;
        if (merchant) reviewData.merchant = merchant;

        const review = await Review.create(reviewData);

        res.status(201).json({ success: true, review });
    } catch (error) {
        next(error);
    }
};

/**
 * @desc    Get reviews for a product
 * @route   GET /api/reviews/product/:id
 * @access  Public
 */
export const getProductReviews = async (req, res, next) => {
    try {
        const productId = req.params.id;
        const page = Math.max(1, parseInt(req.query.page || '1', 10));
        const limit = Math.min(50, parseInt(req.query.limit || '10', 10));
        const skip = (page - 1) * limit;

        const query = { product: productId, moderationStatus: { $ne: 'rejected' } };

        const total = await Review.countDocuments(query);
        const reviews = await Review.find(query)
            .populate('user', 'firstName lastName avatar')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Aggregate counts per rating (1..5)
        const countsAgg = await Review.aggregate([
            { $match: { product: mongoose.Types.ObjectId(productId), isActive: true, moderationStatus: 'approved' } },
            { $group: { _id: '$rating', count: { $sum: 1 } } },
        ]);

        const ratingCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        countsAgg.forEach((c) => {
            ratingCounts[c._id] = c.count;
        });

        // Compute average rating as a convenience
        const avgAgg = await Review.aggregate([
            { $match: { product: mongoose.Types.ObjectId(productId), isActive: true, moderationStatus: 'approved' } },
            { $group: { _id: null, avgRating: { $avg: '$rating' } } },
        ]);
        const avgRating = (avgAgg[0] && avgAgg[0].avgRating) ? Math.round(avgAgg[0].avgRating * 10) / 10 : 0;

        res.status(200).json({ success: true, total, page, limit, reviews, ratingCounts, avgRating });
    } catch (error) {
        next(error);
    }
};
