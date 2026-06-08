import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
    {
        merchant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Merchant',
            required: false, // Made optional for seamless listing
        },

        // ── Basic Information ───────────────────────────────
        name: {
            type: String,
            required: [true, 'Product name is required'],
            trim: true,
            maxlength: [150, 'Product name cannot exceed 150 characters'],
        },
        nameAmharic: {
            type: String,
            trim: true,
            maxlength: [150, 'Amharic product name cannot exceed 150 characters'],
        },
        slug: {
            type: String,
            lowercase: true,
            trim: true,
        },
        image: {
            type: String,
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'Product description is required'],
            maxlength: [3000, 'Description cannot exceed 3000 characters'],
        },
        sku: {
            type: String,
            trim: true,
            uppercase: true,
        },

        // ── Pricing (ETB) ──────────────────────────────────
        price: {
            type: Number,
            required: [true, 'Product price is required'],
            min: [0.01, 'Price must be greater than 0'],
            max: [9999999, 'Price cannot exceed 9,999,999'],
        },
        discountPrice: {
            type: Number,
            min: [0, 'Discount price cannot be negative'],
            validate: [
                {
                    validator: function (val) {
                        if (val == null) return true;
                        const currentPrice = this.price ?? this.getUpdate?.()?.price;
                        return currentPrice != null && val > 0 && val < currentPrice;
                    },
                    message: 'Discount price must be between 0 and the regular price',
                },
                {
                    validator: function (val) {
                        if (val == null) return true;
                        const currentPrice = this.price ?? this.getUpdate?.()?.price;
                        if (currentPrice == null) return true;
                        const discountPercent = ((currentPrice - val) / currentPrice) * 100;
                        return discountPercent <= 80;
                    },
                    message: 'Discount cannot exceed 80% off',
                },
            ],
        },
        currency: {
            type: String,
            default: 'ETB',
            enum: ['ETB', 'USD'],
        },

        // ── Category ────────────────────────────────────────
        category: {
            type: String,
            required: [true, 'Product category is required'],
            enum: [
                'meat',
                'poultry',
                'seafood',
                'dairy',
                'bakery',
                'grains',
                'spices',
                'beverages',
                'snacks',
                'frozen',
                'canned',
                'oils',
                'honey',
                'clothing',
                'cosmetics',
                'perfume',
                'books',
                'home_decor',
                'other',
            ],
        },
        subCategory: { type: String, trim: true },
        tags: [{ type: String, trim: true, lowercase: true }],

        // ── Images ──────────────────────────────────────────
        images: {
            type: [
                {
                    url: { type: String, required: true },
                    publicId: { type: String },
                    alt: { type: String, trim: true },
                    isDefault: { type: Boolean, default: false },
                },
            ],
            validate: [
                (arr) => arr && arr.length > 0,
                'At least one product image is required',
            ],
        },

        // ── Inventory ───────────────────────────────────────
        stock: {
            type: Number,
            required: [true, 'Stock quantity is required'],
            min: [0, 'Stock cannot be negative'],
            default: 0,
        },
        lowStockThreshold: { type: Number, default: 5 },
        isInStock: { type: Boolean, default: true },

        // ── Product Details ─────────────────────────────────
        weight: {
            value: { type: Number },
            unit: {
                type: String,
                enum: ['g', 'kg', 'ml', 'l', 'pcs', 'pack'],
                default: 'kg',
            },
        },
        ingredients: [{ type: String, trim: true }],
        originCountry: { type: String, default: 'Ethiopia', trim: true },

        // ── Halal Information ───────────────────────────────
        halalCertified: { type: Boolean, default: false },
        halalCertification: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Certification',
        },
        halalNotes: {
            type: String,
            maxlength: [500, 'Halal notes cannot exceed 500 characters'],
        },

        // ── Ratings Aggregation ─────────────────────────────
        ratingsAverage: {
            type: Number,
            default: 0,
            min: [0, 'Rating must be at least 0'],
            max: [5, 'Rating cannot exceed 5'],
            set: (val) => Math.round(val * 10) / 10,
        },
        ratingsCount: { type: Number, default: 0 },

        // ── Status ──────────────────────────────────────────
        isActive: { type: Boolean, default: true },
        isFeatured: { type: Boolean, default: false },
        isApproved: { type: Boolean, default: false },
        isDeleted: { type: Boolean, default: false },

        // ── SEO ─────────────────────────────────────────────
        metaTitle: { type: String, trim: true },
        metaDescription: { type: String, trim: true },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ── Indexes ─────────────────────────────────────────────
productSchema.index({ merchant: 1 });
productSchema.index({ category: 1 });
productSchema.index({ price: 1 });
productSchema.index({ ratingsAverage: -1 });
productSchema.index({ slug: 1 });
productSchema.index({ name: 'text', description: 'text' }); // Full-text search
productSchema.index({ tags: 1 });
productSchema.index({ isActive: 1, isApproved: 1 });

// ── Auto-generate slug ─────────────────────────────────
productSchema.pre('save', function () {
    if (this.isModified('name') || this.isNew) {
        this.slug = this.name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }

    // Update isInStock based on stock
    this.isInStock = this.stock > 0;
});

// ── Virtual: effective price (after discount) ───────────
productSchema.virtual('effectivePrice').get(function () {
    return this.discountPrice ?? this.price;
});

// ── Virtual: discount percentage ────────────────────────
productSchema.virtual('discountPercentage').get(function () {
    if (!this.discountPrice || this.discountPrice >= this.price) return 0;
    return Math.round(((this.price - this.discountPrice) / this.price) * 100);
});

// ── Virtual: reviews ────────────────────────────────────
productSchema.virtual('reviews', {
    ref: 'Review',
    localField: '_id',
    foreignField: 'product',
});

const Product = mongoose.model('Product', productSchema);
export default Product;
