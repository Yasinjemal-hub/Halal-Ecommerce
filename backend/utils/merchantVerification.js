import Merchant from '../models/Merchant.js';
import Certification from '../models/Certification.js';
import Mejilis from '../models/Mejilis.js';
import { notifyVerificationDecision } from './notifyMerchant.js';

/**
 * Authoritative merchant verification workflow.
 *
 * Product rule (one approval): Majlis/admin review and approval of a
 * merchant's business registration ALSO approves that business as halal
 * certified on this marketplace. There is one registration form and one
 * review decision — no separate halal certification application, type
 * selection, evidence flow, or second approval.
 *
 * BOTH review surfaces — PUT /api/admin/merchants/:id/verify (Merchants
 * Management workspace) and PUT /api/mejilis/merchants/:id/verify (Majlis
 * review page) — delegate to `decideMerchantVerification`, so the admin
 * list, admin dashboard, and Majlis review page can never produce
 * conflicting verification outcomes.
 *
 * - approving a business automatically issues exactly one halal
 *   certificate (system-generated unique ID, server-side data only);
 * - rejecting issues nothing and grants no selling access;
 * - suspending (or otherwise moving away from approved) invalidates the
 *   certificate so badges/verification no longer appear as valid.
 * Retries are idempotent: never create duplicate certificate IDs.
 */
export const MERCHANT_VERIFICATION_STATUSES = [
    'pending',
    'under_review',
    'approved',
    'rejected',
    'suspended',
];

export class VerificationValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = 'VerificationValidationError';
        this.statusCode = 400;
    }
}

/**
 * System-generated unique certificate ID. Never a merchant/reviewer
 * input field — assigned server-side on business approval only.
 */
export const generateMerchantCertificateNumber = () => {
    const year = new Date().getFullYear();
    const randomPart = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `HC-${year}-${randomPart}`;
};

const defaultCertificateExpiry = () => {
    const fallback = new Date();
    fallback.setFullYear(fallback.getFullYear() + 1);
    return fallback;
};

/**
 * Ensure exactly one issued certificate exists for an approved merchant.
 * Idempotent: returns the existing issued record when present, otherwise
 * approves the linked pending record or creates a fresh approved record.
 * Never creates duplicate certificate numbers on retries.
 */
export const ensureMerchantCertificate = async (merchant, reviewerId) => {
    let cert = merchant.halalCertification
        ? await Certification.findById(merchant.halalCertification)
        : null;

    // Already issued → idempotent no-op.
    if (cert && cert.status === 'approved' && cert.certificateNumber) {
        const expired = cert.expiryDate && new Date(cert.expiryDate) <= new Date();
        if (!expired) return cert;
        // Lapsed by date: re-issue by extending validity on the same record
        // (keeps one certificate ID per merchant).
        cert.expiryDate = defaultCertificateExpiry();
        cert.status = 'approved';
        cert.reviewedBy = reviewerId;
        cert.reviewedAt = new Date();
        await cert.save();
        return cert;
    }

    if (cert && ['pending', 'under_review', 'rejected', 'expired', 'revoked', 'suspended'].includes(cert.status)) {
        // Legacy separate-application record: fold it into the single
        // approval outcome instead of keeping a second decision.
        if (!cert.certificateNumber) cert.certificateNumber = generateMerchantCertificateNumber();
        cert.status = 'approved';
        if (!cert.issueDate) cert.issueDate = new Date();
        if (!cert.expiryDate || new Date(cert.expiryDate) <= new Date()) {
            cert.expiryDate = defaultCertificateExpiry();
        }
        if (!cert.certificateType) cert.certificateType = 'halal_establishment';
        if (!cert.scope) cert.scope = `${merchant.businessType || 'business'} operation — ${merchant.businessName}`;
        cert.reviewedBy = reviewerId;
        cert.reviewedAt = new Date();
        cert.statusHistory.push({
            status: 'approved',
            changedBy: reviewerId,
            changedAt: new Date(),
            note: 'Issued automatically with business approval (one-approval rule).',
        });
        await cert.save();
        await Merchant.findByIdAndUpdate(merchant._id, { halalCertification: cert._id });
        await incrementIssuanceStats();
        return cert;
    }

    // No usable record: create the single business certificate.
    let certificateNumber = generateMerchantCertificateNumber();
    // Guard against the (extremely unlikely) collision.
    for (let attempt = 0; attempt < 3; attempt += 1) {
        const clash = await Certification.findOne({ certificateNumber });
        if (!clash) break;
        certificateNumber = generateMerchantCertificateNumber();
    }
    const created = await Certification.create({
        merchant: merchant._id,
        certificateNumber,
        certificateType: 'halal_establishment',
        status: 'approved',
        issueDate: new Date(),
        expiryDate: defaultCertificateExpiry(),
        scope: `${merchant.businessType || 'business'} operation — ${merchant.businessName}`,
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        statusHistory: [{
            status: 'approved',
            changedBy: reviewerId,
            changedAt: new Date(),
            note: 'Issued automatically with business approval (one-approval rule).',
        }],
    });
    await Merchant.findByIdAndUpdate(merchant._id, { halalCertification: created._id });
    await incrementIssuanceStats();
    return created;
};

const incrementIssuanceStats = async () => {
    try {
        const mejilis = await Mejilis.findOne({ isActive: true });
        if (mejilis) {
            mejilis.totalCertificationsIssued += 1;
            await mejilis.save();
        }
    } catch {
        // Stats must never fail the approval decision.
    }
};

/**
 * Invalidate the linked certificate so badges/verification no longer
 * appear valid when the business is rejected or suspended.
 */
export const invalidateMerchantCertificate = async (merchant) => {
    if (!merchant?.halalCertification) return;
    const cert = await Certification.findById(merchant.halalCertification);
    if (!cert) return;
    if (['approved', 'pending', 'under_review'].includes(cert.status)) {
        cert.status = merchant.verificationStatus === 'suspended' ? 'suspended' : 'revoked';
        cert.statusHistory.push({
            status: cert.status,
            changedBy: merchant.verifiedBy,
            changedAt: new Date(),
            note: `Invalidated automatically: business is '${merchant.verificationStatus}'.`,
        });
        await cert.save();
    }
};

/**
 * Apply a verification decision to a merchant.
 * @param {string} merchantId
 * @param {{ verificationStatus: string, verificationNotes?: string, rejectionReason?: string, reviewerId: string }} decision
 * @returns the updated, populated merchant document
 * @throws VerificationValidationError on invalid status / missing rejection reason
 * @throws Error with statusCode 404 when the merchant does not exist
 */
export const decideMerchantVerification = async (
    merchantId,
    { verificationStatus, verificationNotes, rejectionReason, reviewerId, notify = true }
) => {
    if (!MERCHANT_VERIFICATION_STATUSES.includes(verificationStatus)) {
        throw new VerificationValidationError(
            `Invalid status. Must be one of: ${MERCHANT_VERIFICATION_STATUSES.join(', ')}`
        );
    }

    const cleanReason = (rejectionReason || '').trim();
    if (verificationStatus === 'rejected' && !cleanReason) {
        throw new VerificationValidationError(
            'A rejection reason is required when rejecting a merchant application.'
        );
    }

    const set = {
        verificationStatus,
        verifiedBy: reviewerId,
    };
    if (verificationNotes !== undefined) set.verificationNotes = verificationNotes;
    const unset = {};

    if (verificationStatus === 'approved') {
        set.verifiedAt = new Date();
        unset.rejectionReason = 1;
    } else if (verificationStatus === 'rejected') {
        set.rejectionReason = cleanReason;
        unset.verifiedAt = 1;
    } else {
        // Moving away from a decision clears its artefacts so stale
        // "verified"/"rejected" data can never linger on another status.
        unset.verifiedAt = 1;
        unset.rejectionReason = 1;
    }

    const merchant = await Merchant.findByIdAndUpdate(
        merchantId,
        { $set: set, $unset: unset },
        { new: true, runValidators: true }
    ).populate('user', 'firstName lastName email phone');

    if (!merchant) {
        const notFound = new Error('Merchant not found');
        notFound.statusCode = 404;
        throw notFound;
    }

    // One-approval rule: approval issues the certificate, rejection and
    // suspension invalidate it. Retries never duplicate certificate IDs.
    if (verificationStatus === 'approved') {
        await ensureMerchantCertificate(merchant, reviewerId);
        // Reload so callers (and API responses) include the linked record.
        await merchant.populate('halalCertification');
    } else if (verificationStatus === 'rejected' || verificationStatus === 'suspended') {
        await invalidateMerchantCertificate(merchant);
        await merchant.populate('halalCertification');
    }

    // Best-effort outcome notification (never fails the decision).
    // Fire-and-forget: no-ops when email delivery is not configured.
    // Fixture/repair runs pass notify:false so demo accounts are never emailed.
    if (notify) {
        notifyVerificationDecision({
            to: merchant.user?.email,
            businessName: merchant.businessName,
            verificationStatus,
            rejectionReason: verificationStatus === 'rejected' ? cleanReason : undefined,
        }).catch(() => {});
    }

    return merchant;
};

export default decideMerchantVerification;
