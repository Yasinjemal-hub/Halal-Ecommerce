import mongoose from 'mongoose';
import Certification from '../models/Certification.js';
import Merchant from '../models/Merchant.js';
import Mejilis from '../models/Mejilis.js';

/**
 * Authoritative halal-certification workflow.
 *
 * Product rule (one approval): business approval IS halal certification.
 * The single review decision in utils/merchantVerification.js issues the
 * certificate automatically. The helpers below remain for issuance checks,
 * PDF/public verification, and the idempotent backfill — the separate
 * second application/review flow is retired (see reviewCertification).
 */
export const CERTIFICATION_STATUSES = [
    'pending',
    'under_review',
    'approved',
    'rejected',
    'expired',
    'revoked',
    'suspended',
];

// Allowed reviewer-driven transitions. Terminal states stay terminal
// except expiry, which may be renewed through an explicit re-approval.
export const CERTIFICATION_TRANSITIONS = {
    pending: ['under_review', 'approved', 'rejected'],
    under_review: ['approved', 'rejected', 'pending'],
    approved: ['suspended', 'revoked', 'expired'],
    suspended: ['approved', 'revoked'],
    rejected: ['pending', 'under_review'],
    revoked: [],
    expired: ['approved', 'pending'],
};

export class CertificationValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'CertificationValidationError';
        this.statusCode = 400;
    }
}

export const CERTIFICATE_TYPES = [
    'halal_product',
    'halal_establishment',
    'halal_slaughter',
    'halal_import',
];

export const CERT_DOCUMENT_TYPES = [
    'application_form',
    'business_license',
    'halal_certificate',
    'inspection_report',
    'ingredient_list',
    'supplier_certificate',
    'slaughter_license',
    'import_permit',
    'other',
];

// Supporting evidence must be a genuinely uploaded file (data: URL),
// never an arbitrary public link passed as proof.
export const ALLOWED_EVIDENCE_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
export const MAX_EVIDENCE_CHARS = 7000000; // ~5MB decoded

export const validateEvidenceDocuments = (documents) => {
    if (!Array.isArray(documents) || documents.length === 0) {
        return 'At least one supporting document is required.';
    }
    for (const [index, doc] of documents.entries()) {
        if (!doc || typeof doc.name !== 'string' || !doc.name.trim()) {
            return `Document #${index + 1}: a name is required.`;
        }
        if (typeof doc.url !== 'string' || !doc.url.startsWith('data:')) {
            return `Document "${doc.name}": upload the file itself — public links are not accepted as proof.`;
        }
        const mime = doc.url.slice(5, doc.url.indexOf(';'));
        if (!ALLOWED_EVIDENCE_MIME.includes(mime)) {
            return `Document "${doc.name}": type ${mime || 'unknown'} is not allowed. Use JPG, PNG, WEBP, or PDF.`;
        }
        if (doc.url.length > MAX_EVIDENCE_CHARS) {
            return `Document "${doc.name}" exceeds the 5MB size limit.`;
        }
        if (doc.documentType && !CERT_DOCUMENT_TYPES.includes(doc.documentType)) {
            return `Document "${doc.name}": unknown document type.`;
        }
    }
    return null;
};

export const sanitizeCoveredProducts = (value) => {
    if (!Array.isArray(value)) return [];
    return value.map((v) => String(v).trim()).filter(Boolean).slice(0, 100);
};

// An application blocks a new one while it is still live.
export const LIVE_APPLICATION_STATUSES = ['pending', 'under_review', 'approved', 'suspended'];

/**
 * Validate a merchant-supplied certification application payload
 * (registration evidence, standalone applications, resubmissions).
 * @returns error message string, or null when valid.
 */
export const validateCertificationApplication = ({ certificateType, scope, coveredProducts, documents }) => {
    if (!CERTIFICATE_TYPES.includes(certificateType)) {
        return `Invalid certificate type. Must be one of: ${CERTIFICATE_TYPES.join(', ')}.`;
    }
    if (!(scope || '').toString().trim()) {
        return 'Requested scope is required (products, activities, or locations covered).';
    }
    if (coveredProducts !== undefined && !Array.isArray(coveredProducts)) {
        return 'Covered products must be an array.';
    }
    return validateEvidenceDocuments(documents);
};

/**
 * Single consistent issuance rule shared by the review endpoint, the PDF
 * download, public verification, and merchant status display: a
 * certificate counts as issued ONLY when the linked business is approved
 * AND the certificate record is approved with an assigned number, while
 * unexpired. Pending, rejected, suspended, revoked, or expired records —
 * or any non-approved business — never satisfy this.
 */
export const isCertificateIssued = (cert, merchant = null) => {
    if (!cert || cert.status !== 'approved' || !cert.certificateNumber) return false;
    if (cert.expiryDate && new Date(cert.expiryDate) <= new Date()) return false;
    if (merchant && merchant.verificationStatus !== 'approved') return false;
    return true;
};

/**
 * Store/product "Halal Verified" badge rule: same approved status and
 * certificate record. Never show for pending, rejected, or suspended.
 */
export const isMerchantHalalVerified = (merchant) => {
    if (!merchant || merchant.verificationStatus !== 'approved') return false;
    const cert = merchant.halalCertification && typeof merchant.halalCertification === 'object'
        ? merchant.halalCertification
        : null;
    // When only an ID is populated, fall back to approval status alone;
    // full checks happen server-side with the populated record.
    if (!cert) return false;
    return isCertificateIssued(cert, merchant);
};

const generateCertificateNumber = () => {
    const year = new Date().getFullYear();
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `HC-${year}-${randomPart}`;
};

const defaultExpiry = () => {
    const fallback = new Date();
    fallback.setFullYear(fallback.getFullYear() + 1);
    return fallback;
};

/**
 * Apply a certification decision atomically: certification update,
 * merchant link, and issuance statistics commit together or not at all.
 *
 * Idempotency: repeating the current status is a no-op (no duplicate
 * number, no stats change). Stats increment only on first entry into
 * 'approved' — retries after issuance change nothing.
 *
 * @returns the updated certification document
 * @throws CertificationValidationError on invalid status/transition/reason
 * @throws Error with statusCode 404 when the certification does not exist
 */
export const decideCertificationReview = async (
    certId,
    { status, reviewNotes, rejectionReason, revocationReason, expiryDate, scope, reviewerId }
) => {
    if (!CERTIFICATION_STATUSES.includes(status)) {
        throw new CertificationValidationError(
            `Invalid status. Must be one of: ${CERTIFICATION_STATUSES.join(', ')}`
        );
    }

    const session = await mongoose.startSession();
    session.startTransaction();
    try {
        const cert = await Certification.findById(certId).session(session);
        if (!cert) {
            const notFound = new Error('Certification not found');
            notFound.statusCode = 404;
            throw notFound;
        }

        // Idempotent retry: already in the target state → return as-is.
        if (cert.status === status) {
            await session.abortTransaction();
            return cert;
        }

        const allowed = CERTIFICATION_TRANSITIONS[cert.status] || [];
        if (!allowed.includes(status)) {
            throw new CertificationValidationError(
                `Cannot move certification from '${cert.status}' to '${status}'.`
            );
        }

        if (status === 'rejected' && !(rejectionReason || '').trim()) {
            throw new CertificationValidationError(
                'A rejection reason is required — it is the corrections request the merchant acts on.'
            );
        }
        if (status === 'revoked' && !(revocationReason || '').trim()) {
            throw new CertificationValidationError(
                'A revocation reason is required when revoking a certificate.'
            );
        }

        const previousStatus = cert.status;
        cert.status = status;
        if (reviewNotes !== undefined) cert.reviewNotes = reviewNotes;
        cert.reviewedBy = reviewerId;
        cert.reviewedAt = new Date();
        if (status === 'rejected') cert.rejectionReason = rejectionReason.trim();
        if (status === 'revoked') cert.revocationReason = revocationReason.trim();
        if (scope !== undefined) cert.scope = scope;

        let firstIssuance = false;
        if (status === 'approved') {
            // Assign the unique number exactly once; retries keep it.
            if (!cert.certificateNumber) {
                cert.certificateNumber = generateCertificateNumber();
                cert.issueDate = new Date();
            }
            cert.expiryDate = expiryDate ? new Date(expiryDate) : cert.expiryDate || defaultExpiry();
            firstIssuance = previousStatus !== 'approved';
        }

        cert.statusHistory.push({
            status,
            changedBy: reviewerId,
            changedAt: new Date(),
            note: (reviewNotes || rejectionReason || revocationReason || '').toString().slice(0, 1000) || undefined,
        });

        await cert.save({ session });

        // Link the issued certification to its merchant, atomically.
        if (status === 'approved' && cert.merchant) {
            await Merchant.findByIdAndUpdate(
                cert.merchant,
                { halalCertification: cert._id },
                { session }
            );
        }

        // Count an issuance exactly once — never on retries.
        if (firstIssuance) {
            const mejilis = await Mejilis.findOne({ isActive: true }).session(session);
            if (mejilis) {
                mejilis.totalCertificationsIssued += 1;
                await mejilis.save({ session });
            }
        }

        await session.commitTransaction();
        return cert;
    } catch (error) {
        await session.abortTransaction();
        throw error;
    } finally {
        session.endSession();
    }
};

export default decideCertificationReview;
