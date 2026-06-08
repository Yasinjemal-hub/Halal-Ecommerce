import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Review must belong to a user'],
        },

        // ── Review Target (Product or Merchant) ─────────────
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
        },
        merchant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Merchant',
        },
        reviewType: {
            type: String,
            enum: ['product', 'merchant'],
            required: [true, 'Review type is required'],
        },

        // ── Review Content ──────────────────────────────────
        rating: {
            type: Number,
            required: [true, 'Rating is required'],
            min: [1, 'Rating must be at least 1'],
            max: [5, 'Rating cannot exceed 5'],
        },
        title: {
            type: String,
            trim: true,
            maxlength: [100, 'Review title cannot exceed 100 characters'],
        },
        comment: {
            type: String,
            trim: true,
            maxlength: [2000, 'Review comment cannot exceed 2000 characters'],
        },
        images: [
            {
                url: { type: String, required: true },
                publicId: { type: String },
            },
        ],

        // ── Verification ────────────────────────────────────
        isVerifiedPurchase: { type: Boolean, default: false },
        orderRef: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Order',
        },

        // ── Engagement ──────────────────────────────────────
        helpfulCount: { type: Number, default: 0 },
        helpfulBy: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        ],

        // ── Merchant Reply ──────────────────────────────────
        merchantReply: {
            comment: { type: String, trim: true, maxlength: 1000 },
            repliedAt: Date,
            repliedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
        },

        // ── Moderation ──────────────────────────────────────
        moderationStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'flagged'],
            default: 'approved',
        },
        moderationNote: { type: String, maxlength: 500 },
        isActive: { type: Boolean, default: true },

        // ── Report ──────────────────────────────────────────
        reportCount: { type: Number, default: 0 },
        reportedBy: [
            {
                user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
                reason: { type: String },
                reportedAt: { type: Date, default: Date.now },
            },
        ],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ── Indexes ─────────────────────────────────────────────
reviewSchema.index({ product: 1, user: 1 }, { unique: true, sparse: true }); // One review per user per product
reviewSchema.index({ merchant: 1, user: 1 }, { sparse: true });
reviewSchema.index({ reviewType: 1 });
reviewSchema.index({ rating: 1 });
reviewSchema.index({ createdAt: -1 });
reviewSchema.index({ moderationStatus: 1 });

// ── Validation: must have either product or merchant ────
reviewSchema.pre('validate', function () {
    if (this.reviewType === 'product' && !this.product) {
        this.invalidate('product', 'Product is required for product reviews');
    }
    if (this.reviewType === 'merchant' && !this.merchant) {
        this.invalidate('merchant', 'Merchant is required for merchant reviews');
    }
});

// ── Static: calculate average rating ────────────────────
reviewSchema.statics.calcAverageRatings = async function (targetId, targetType) {
    const matchField = targetType === 'product' ? 'product' : 'merchant';

    const stats = await this.aggregate([
        {
            $match: {
                [matchField]: targetId,
                isActive: true,
                moderationStatus: 'approved',
            },
        },
        {
            $group: {
                _id: `$${matchField}`,
                avgRating: { $avg: '$rating' },
                numRatings: { $sum: 1 },
            },
        },
    ]);

    const Model = mongoose.model(targetType === 'product' ? 'Product' : 'Merchant');

    if (stats.length > 0) {
        await Model.findByIdAndUpdate(targetId, {
            ratingsAverage: stats[0].avgRating,
            ratingsCount: stats[0].numRatings,
        });
    } else {
        await Model.findByIdAndUpdate(targetId, {
            ratingsAverage: 0,
            ratingsCount: 0,
        });
    }
};

// ── Post-save: recalculate ratings ──────────────────────
reviewSchema.post('save', function () {
    const targetId = this.reviewType === 'product' ? this.product : this.merchant;
    this.constructor.calcAverageRatings(targetId, this.reviewType);
});

// ── Post-remove: recalculate ratings ────────────────────
reviewSchema.post('findOneAndDelete', function (doc) {
    if (doc) {
        const targetId = doc.reviewType === 'product' ? doc.product : doc.merchant;
        doc.constructor.calcAverageRatings(targetId, doc.reviewType);
    }
});

const Review = mongoose.model('Review', reviewSchema);
export default Review;
