import mongoose from 'mongoose';

const inspectionSchema = new mongoose.Schema(
    {
        inspectorName: { type: String, required: true, trim: true },
        inspectorId: { type: String, trim: true },
        inspectionDate: { type: Date, required: true },
        location: { type: String, trim: true },
        findings: { type: String, maxlength: 3000 },
        result: {
            type: String,
            enum: ['pass', 'fail', 'conditional_pass'],
            required: true,
        },
        conditions: [{ type: String, trim: true }], // Requirements for conditional pass
        attachments: [
            {
                url: { type: String },
                publicId: { type: String },
                name: { type: String },
            },
        ],
    },
    { _id: true, timestamps: true }
);

const renewalHistorySchema = new mongoose.Schema(
    {
        previousCertificateNumber: { type: String },
        renewedAt: { type: Date, required: true },
        previousExpiryDate: Date,
        newExpiryDate: Date,
        renewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        notes: { type: String, maxlength: 500 },
    },
    { _id: true }
);

const certificationSchema = new mongoose.Schema(
    {
        merchant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Merchant',
            required: [true, 'Certification must belong to a merchant'],
        },

        // ── Certificate Details ─────────────────────────────
        certificateNumber: {
            type: String,
            unique: true,
            sparse: true, // Allow null for pending applications
            trim: true,
        },
        issuingAuthority: {
            type: String,
            default: 'Ethiopian Islamic Affairs Supreme Council (Majlis)',
            trim: true,
        },
        certificateType: {
            type: String,
            enum: ['halal_product', 'halal_establishment', 'halal_slaughter', 'halal_import'],
            required: [true, 'Certificate type is required'],
        },

        // ── Status ──────────────────────────────────────────
        status: {
            type: String,
            enum: ['pending', 'under_review', 'approved', 'rejected', 'expired', 'revoked', 'suspended'],
            default: 'pending',
        },

        // ── Dates ───────────────────────────────────────────
        applicationDate: { type: Date, default: Date.now },
        issueDate: Date,
        expiryDate: Date,

        // ── Documents ───────────────────────────────────────
        documents: [
            {
                name: {
                    type: String,
                    required: true,
                    trim: true,
                },
                url: { type: String, required: true },
                publicId: { type: String },
                documentType: {
                    type: String,
                    enum: [
                        'application_form',
                        'business_license',
                        'halal_certificate',
                        'inspection_report',
                        'ingredient_list',
                        'supplier_certificate',
                        'slaughter_license',
                        'import_permit',
                        'other',
                    ],
                },
                uploadedAt: { type: Date, default: Date.now },
            },
        ],

        // ── Inspection ──────────────────────────────────────
        inspections: [inspectionSchema],

        // ── Compliance ──────────────────────────────────────
        complianceConditions: [{ type: String, trim: true }],
        complianceNotes: { type: String, maxlength: 2000 },

        // ── Admin / Majlis Review ───────────────────────────
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
        },
        reviewedAt: Date,
        reviewNotes: { type: String, maxlength: 2000 },
        rejectionReason: { type: String, maxlength: 1000 },
        revocationReason: { type: String, maxlength: 1000 },

        // ── Renewal ─────────────────────────────────────────
        isRenewal: { type: Boolean, default: false },
        renewalHistory: [renewalHistorySchema],

        // ── Scope ───────────────────────────────────────────
        scope: {
            type: String,
            maxlength: 1000,
            trim: true, // What products/activities are covered
        },
        coveredProducts: [{ type: String, trim: true }],
    },
    {
        timestamps: true,
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// ── Indexes ─────────────────────────────────────────────
certificationSchema.index({ merchant: 1 });
certificationSchema.index({ status: 1 });
certificationSchema.index({ expiryDate: 1 });
certificationSchema.index({ certificateType: 1 });

// ── Virtual: isExpired ──────────────────────────────────
certificationSchema.virtual('isExpired').get(function () {
    if (!this.expiryDate) return false;
    return new Date() > this.expiryDate;
});

// ── Virtual: days until expiry ──────────────────────────
certificationSchema.virtual('daysUntilExpiry').get(function () {
    if (!this.expiryDate) return null;
    const diff = this.expiryDate.getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
});

// ── Auto-generate certificate number on approval ────────
certificationSchema.pre('save', function () {
    if (this.isModified('status') && this.status === 'approved' && !this.certificateNumber) {
        const year = new Date().getFullYear();
        const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.certificateNumber = `HC-${year}-${randomPart}`;
        this.issueDate = new Date();
    }

    // Auto-expire if past expiry date
    if (this.expiryDate && new Date() > this.expiryDate && this.status === 'approved') {
        this.status = 'expired';
    }
});

const Certification = mongoose.model('Certification', certificationSchema);
export default Certification;
