import mongoose from 'mongoose';

const operatingHoursSchema = new mongoose.Schema(
    {
        day: {
            type: String,
            enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
            required: true,
        },
        open: { type: String, required: true },  // e.g. "08:00"
        close: { type: String, required: true }, // e.g. "22:00"
        isClosed: { type: Boolean, default: false },
    },
    { _id: false }
);

const merchantSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
            unique: true,
        },

        // ── Business Information ────────────────────────────
        businessName: {
            type: String,
            required: [true, 'Business name is required'],
            trim: true,
            maxlength: [100, 'Business name cannot exceed 100 characters'],
        },
        businessNameAmharic: {
            type: String,
            trim: true,
            maxlength: [100, 'Amharic business name cannot exceed 100 characters'],
        },
        slug: {
            type: String,
            unique: true,
            lowercase: true,
            trim: true,
        },
        description: {
            type: String,
            required: [true, 'Business description is required'],
            maxlength: [2000, 'Description cannot exceed 2000 characters'],
        },
        businessType: {
            type: String,
            required: [true, 'Business type is required'],
            enum: [
                'restaurant',
                'grocery',
                'butcher',
                'bakery',
                'wholesale',
                'cosmetics',
                'clothing',
                'spice_shop',
                'supermarket',
                'other',
            ],
        },

        // ── Media ───────────────────────────────────────────
        logo: {
            url: { type: String, default: '' },
            publicId: { type: String, default: '' },
        },
        banner: {
            url: { type: String, default: '' },
            publicId: { type: String, default: '' },
        },

        // ── Business Address ────────────────────────────────
        businessAddress: {
            street: { type: String, trim: true },
            subcity: { type: String, trim: true },
            woreda: { type: String, trim: true },
            city: { type: String, trim: true, default: 'Addis Ababa' },
            region: {
                type: String,
                enum: [
                    'Addis Ababa',
                    'Afar',
                    'Amhara',
                    'Benishangul-Gumuz',
                    'Dire Dawa',
                    'Gambella',
                    'Harari',
                    'Oromia',
                    'Sidama',
                    'Somali',
                    'South West Ethiopia',
                    'Southern Nations',
                    'Tigray',
                ],
            },
            coordinates: {
                latitude: { type: Number },
                longitude: { type: Number },
            },
        },

        // ── Contact ─────────────────────────────────────────
        businessPhone: {
            type: String,
            required: [true, 'Business phone is required'],
            match: [/^(\+251|0)(9|7)\d{8}$/, 'Please provide a valid Ethiopian phone number'],
        },
        businessEmail: {
            type: String,
            lowercase: true,
            trim: true,
        },
        website: { type: String, trim: true },

        // ── Halal Verification by Majlis ────────────────────
        verificationStatus: {
            type: String,
            enum: ['pending', 'under_review', 'approved', 'rejected', 'suspended'],
            default: 'pending',
        },
        verifiedAt: Date,
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User', // Admin / Majlis user
        },
        verificationNotes: { type: String, maxlength: 1000 },
        halalCertification: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Certification',
        },

        // ── Operating Hours ─────────────────────────────────
        operatingHours: [operatingHoursSchema],

        // ── Payment / Bank ──────────────────────────────────
        paymentInfo: {
            bankName: {
                type: String,
                enum: [
                    'Commercial Bank of Ethiopia',
                    'Awash Bank',
                    'Dashen Bank',
                    'Bank of Abyssinia',
                    'Wegagen Bank',
                    'United Bank',
                    'Nib International Bank',
                    'Cooperative Bank of Oromia',
                    'Abay Bank',
                    'Berhan Bank',
                    'Other',
                ],
            },
            accountNumber: { type: String, trim: true },
            accountHolderName: { type: String, trim: true },
            telebirrNumber: { type: String, trim: true },
            cbeBirrNumber: { type: String, trim: true },
        },

        // ── Social Media ────────────────────────────────────
        socialMedia: {
            telegram: { type: String, trim: true },
            facebook: { type: String, trim: true },
            instagram: { type: String, trim: true },
            tiktok: { type: String, trim: true },
        },

        // ── Ratings Aggregation ─────────────────────────────
        ratingsAverage: {
            type: Number,
            default: 0,
            min: [0, 'Rating must be at least 0'],
            max: [5, 'Rating cannot exceed 5'],
            set: (val) => Math.round(val * 10) / 10, // e.g. 4.6667 → 4.7
        },
        ratingsCount: { type: Number, default: 0 },

        // ── Metrics ─────────────────────────────────────────
        totalProducts: { type: Number, default: 0 },
        totalOrders: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 }, // in ETB

        // ── Status ──────────────────────────────────────────
        isActive: { type: Boolean, default: true },
        isFeatured: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ── Indexes ─────────────────────────────────────────────
merchantSchema.index({ user: 1 });
merchantSchema.index({ slug: 1 });
merchantSchema.index({ verificationStatus: 1 });
merchantSchema.index({ businessType: 1 });
merchantSchema.index({ 'businessAddress.city': 1 });
merchantSchema.index({ ratingsAverage: -1 });

// ── Auto-generate slug from businessName ────────────────
merchantSchema.pre('save', function () {
    if (this.isModified('businessName') || this.isNew) {
        this.slug = this.businessName
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
    }
});

// ── Virtual: products ───────────────────────────────────
merchantSchema.virtual('products', {
    ref: 'Product',
    localField: '_id',
    foreignField: 'merchant',
});

const Merchant = mongoose.model('Merchant', merchantSchema);
export default Merchant;
