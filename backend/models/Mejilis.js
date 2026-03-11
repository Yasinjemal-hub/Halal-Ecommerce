import mongoose from 'mongoose';

/**
 * Mejilis (Council) Session Schema
 * Tracks council meetings where merchant reviews and certifications happen
 */
const sessionSchema = new mongoose.Schema(
    {
        sessionTitle: {
            type: String,
            required: [true, 'Session title is required'],
            trim: true,
            maxlength: [200, 'Session title cannot exceed 200 characters'],
        },
        sessionDate: {
            type: Date,
            required: [true, 'Session date is required'],
        },
        status: {
            type: String,
            enum: ['scheduled', 'in_progress', 'completed', 'cancelled'],
            default: 'scheduled',
        },
        agenda: [
            {
                topic: { type: String, required: true, trim: true },
                description: { type: String, trim: true },
                merchant: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'Merchant',
                },
                decision: {
                    type: String,
                    enum: ['pending', 'approved', 'rejected', 'deferred'],
                    default: 'pending',
                },
                notes: { type: String, maxlength: 2000 },
            },
        ],
        attendees: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                role: {
                    type: String,
                    enum: ['chairperson', 'member', 'secretary', 'observer'],
                    default: 'member',
                },
            },
        ],
        minutes: {
            type: String,
            maxlength: 10000,
        },
        resolutions: [
            {
                resolutionText: { type: String, required: true, trim: true },
                status: {
                    type: String,
                    enum: ['passed', 'rejected', 'tabled'],
                    default: 'passed',
                },
                votesFor: { type: Number, default: 0 },
                votesAgainst: { type: Number, default: 0 },
                votesAbstain: { type: Number, default: 0 },
            },
        ],
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
    },
    { _id: true, timestamps: true }
);

/**
 * Mejilis Complaint Schema
 * Consumer complaints tracked through the Mejilis system
 */
const complaintSchema = new mongoose.Schema(
    {
        complainant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: [true, 'Complainant is required'],
        },
        merchant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Merchant',
            required: [true, 'Merchant is required'],
        },
        category: {
            type: String,
            enum: [
                'halal_violation',
                'quality_issue',
                'false_advertising',
                'hygiene_concern',
                'pricing_dispute',
                'delivery_issue',
                'customer_service',
                'other',
            ],
            required: [true, 'Complaint category is required'],
        },
        subject: {
            type: String,
            required: [true, 'Subject is required'],
            trim: true,
            maxlength: [200, 'Subject cannot exceed 200 characters'],
        },
        description: {
            type: String,
            required: [true, 'Description is required'],
            maxlength: [5000, 'Description cannot exceed 5000 characters'],
        },
        evidence: [
            {
                url: { type: String },
                publicId: { type: String },
                name: { type: String },
                uploadedAt: { type: Date, default: Date.now },
            },
        ],
        status: {
            type: String,
            enum: ['submitted', 'under_review', 'investigating', 'resolved', 'dismissed', 'escalated'],
            default: 'submitted',
        },
        priority: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium',
        },
        assignedTo: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        resolution: {
            resolvedAt: Date,
            resolvedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User',
            },
            action: { type: String, maxlength: 2000 },
            outcome: {
                type: String,
                enum: ['merchant_warned', 'merchant_suspended', 'merchant_cleared', 'refund_issued', 'no_action'],
            },
        },
        merchantResponse: {
            response: { type: String, maxlength: 3000 },
            respondedAt: Date,
        },
        referenceNumber: {
            type: String,
            unique: true,
            sparse: true,
        },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

/**
 * Main Mejilis Schema
 * The central council entity managing merchant oversight
 */
const mejilisSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            default: 'Ethiopian Islamic Affairs Supreme Council (Majlis)',
            trim: true,
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
                'National',
            ],
            default: 'National',
        },
        members: [
            {
                user: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: 'User',
                },
                role: {
                    type: String,
                    enum: ['chairperson', 'vice_chairperson', 'secretary', 'member', 'inspector'],
                    default: 'member',
                },
                joinedAt: { type: Date, default: Date.now },
                isActive: { type: Boolean, default: true },
            },
        ],
        sessions: [sessionSchema],
        complaints: [complaintSchema],

        // Statistics
        totalMerchantsReviewed: { type: Number, default: 0 },
        totalCertificationsIssued: { type: Number, default: 0 },
        totalComplaintsResolved: { type: Number, default: 0 },
        totalSessionsHeld: { type: Number, default: 0 },

        isActive: { type: Boolean, default: true },
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ── Indexes ─────────────────────────────────────────────
mejilisSchema.index({ region: 1 });
complaintSchema.index({ status: 1 });
complaintSchema.index({ merchant: 1 });
complaintSchema.index({ complainant: 1 });
complaintSchema.index({ referenceNumber: 1 });
sessionSchema.index({ sessionDate: -1 });

// ── Auto-generate complaint reference number ────────────
complaintSchema.pre('save', function (next) {
    if (!this.referenceNumber) {
        const year = new Date().getFullYear();
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.referenceNumber = `MJC-${year}-${randomPart}`;
    }
    next();
});

const Mejilis = mongoose.model('Mejilis', mejilisSchema);
export default Mejilis;
