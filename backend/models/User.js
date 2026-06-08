import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const addressSchema = new mongoose.Schema(
    {
        street: { type: String, trim: true },
        subcity: { type: String, trim: true },
        city: {
            type: String,
            trim: true,
            default: 'Addis Ababa',
        },
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
        postalCode: { type: String, trim: true },
        country: { type: String, default: 'Ethiopia' },
    },
    { _id: false }
);

const userSchema = new mongoose.Schema(
    {
        firstName: {
            type: String,
            required: [true, 'First name is required'],
            trim: true,
            maxlength: [50, 'First name cannot exceed 50 characters'],
        },
        lastName: {
            type: String,
            required: [true, 'Last name is required'],
            trim: true,
            maxlength: [50, 'Last name cannot exceed 50 characters'],
        },
        email: {
            type: String,
            required: [true, 'Email is required'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [
                /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
                'Please provide a valid email address',
            ],
        },
        password: {
            type: String,
            required: [true, 'Password is required'],
            minlength: [8, 'Password must be at least 8 characters'],
            select: false, // Exclude password from queries by default
        },
        phone: {
            type: String,
            trim: true,
            match: [
                /^(?:\+251|0)([79]\d{8})$/,
                'Please provide a valid Ethiopian phone number (format: +251912345678 or 0912345678)',
            ],
        },
        role: {
            type: String,
            enum: ['consumer', 'merchant', 'admin'],
            default: 'consumer',
        },
        avatar: {
            url: { type: String, default: '' },
            publicId: { type: String, default: '' },
        },
        address: addressSchema,
        preferredLanguage: {
            type: String,
            enum: ['en', 'am', 'om', 'so'],
            default: 'en',
        },

        pendingProfileUpdate: {
            firstName: { type: String, trim: true, maxlength: 50 },
            lastName: { type: String, trim: true, maxlength: 50 },
            email: {
                type: String,
                lowercase: true,
                trim: true,
                match: [/^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, 'Please provide a valid email address'],
            },
            phone: {
                type: String,
                trim: true,
                match: [/^(?:\+251|0)([79]\d{8})$/, 'Please provide a valid Ethiopian phone number (format: +251912345678 or 0912345678)'],
            },
            requestedAt: Date,
            status: {
                type: String,
                enum: ['pending', 'approved', 'rejected'],
                default: 'pending',
            },
            reviewedAt: Date,
            reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            reviewNotes: { type: String, trim: true },
        },

        // Email verification
        isEmailVerified: { type: Boolean, default: false },
        emailVerificationToken: String,
        emailVerificationExpires: Date,
        emailVerificationAttempts: { type: Number, default: 0 },

        // Password reset
        passwordResetToken: String,
        passwordResetExpires: Date,

        // Refresh token (hashed) for server-side invalidation
        refreshToken: { type: String, select: false },
        refreshTokenExpires: Date,

        // Account status
        isActive: { type: Boolean, default: true },
        lastLogin: Date,
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ── Virtual: full name ─────────────────────────────────
userSchema.virtual('fullName').get(function () {
    return `${this.firstName} ${this.lastName}`;
});

// ── Index for fast lookups ─────────────────────────────
userSchema.index({ role: 1 });

// ── Pre-save: hash password ────────────────────────────
userSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

// ── Instance method: compare password ──────────────────
userSchema.methods.comparePassword = async function (candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);
export default User;
