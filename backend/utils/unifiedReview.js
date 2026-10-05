import mongoose from 'mongoose';
import Merchant from '../models/Merchant.js';
import Certification from '../models/Certification.js';
import Mejilis from '../models/Mejilis.js';
import {
    decideMerchantVerification,
    MERCHANT_VERIFICATION_STATUSES,
} from './merchantVerification.js';
import {
    decideCertificationReview,
    validateCertificationApplication,
    sanitizeCoveredProducts,
} from './certificationWorkflow.js';

/**
 * Unified Majlis review: one decision covering BOTH the merchant business
 * account and its halal certification, so a merchant submits a single
 * application and a reviewer examines the same evidence once.
 *
 * Rules:
 * - The business part follows the standard verification workflow.
 * - A certification decision (approve / reject / request_changes) is only
 *   possible when the resulting business status is 'approved'. Otherwise
 *   the reviewer must use 'business_only' (approve the business without
 *   issuing any certificate) or 'defer' (leave certification untouched).
 * - Certification approval additionally requires:
 *     1. Majlis authorization (active council member, or superadmin), and
 *     2. an explicit halalEvidenceConfirmed confirmation, and
 *     3. resolvable certification evidence (the linked application with
 *        documents, or scope + type + documents supplied with the decision).
 *   Omitting the certification block entirely is always a business-only
 *   decision and can never issue a certificate.
 * - Certification number assignment, merchant linking, and issuance
 *   statistics reuse the idempotent certification workflow.
 *
 * Ordering: everything is validated first, then the business decision is
 * applied, then the certification decision. If the certification step
 * fails, the business decision already stands — which is exactly the
 * safe "business approved, no certificate" state — and the error is
 * surfaced so the reviewer can retry the certification part alone.
 */
export const CERTIFICATION_DECISION_ACTIONS = [
    'approve',
    'reject',
    'request_changes',
    'business_only',
    'defer',
];

export class UnifiedReviewAuthorizationError extends Error {
    constructor(message = 'Certification decisions require an authorized Majlis reviewer.') {
        super(message);
        this.name = 'UnifiedReviewAuthorizationError';
        this.statusCode = 403;
    }
}

/**
 * A reviewer is Majlis-authorized when they are a superadmin, or an
 * active member of the active Mejilis council. Ordinary admins without
 * council membership may decide the business account but never issue,
 * reject, or request changes on a certification through this path.
 */
export const isMajlisAuthorized = async (reviewer) => {
    if (!reviewer) return false;
    if (reviewer.role === 'superadmin') return true;
    const council = await Mejilis.findOne({ isActive: true }, { members: 1 });
    if (!council) return false;
    return (council.members || []).some(
        (m) => m.isActive !== false && m.user?.toString() === reviewer._id?.toString()
    );
};

const CERT_REVIEWABLE = ['pending', 'under_review'];

export const decideUnifiedReview = async (
    merchantId,
    {
        verificationStatus,
        verificationNotes,
        rejectionReason,
        certification,
        reviewer,
    }
) => {
    if (!MERCHANT_VERIFICATION_STATUSES.includes(verificationStatus)) {
        const err = new Error(
            `Invalid status. Must be one of: ${MERCHANT_VERIFICATION_STATUSES.join(', ')}`
        );
        err.statusCode = 400;
        throw err;
    }

    const certAction = certification?.action || 'defer';
    if (!CERTIFICATION_DECISION_ACTIONS.includes(certAction)) {
        const err = new Error(
            `Invalid certification action. Must be one of: ${CERTIFICATION_DECISION_ACTIONS.join(', ')}.`
        );
        err.statusCode = 400;
        throw err;
    }

    const certDecisionRequested = ['approve', 'reject', 'request_changes'].includes(certAction);

    // ── Validate everything before mutating anything ──────────
    if (certAction === 'approve' && verificationStatus !== 'approved') {
        const err = new Error(
            `Cannot issue a certificate while the business decision is '${verificationStatus}'. Approve the business first, or choose business-only.`
        );
        err.statusCode = 400;
        throw err;
    }
    if ((certAction === 'reject' || certAction === 'request_changes') && ['rejected', 'suspended'].includes(verificationStatus)) {
        const err = new Error(
            `Cannot decide certification while the business is '${verificationStatus}'. Resolve the business decision first.`
        );
        err.statusCode = 400;
        throw err;
    }

    if (certDecisionRequested && !(await isMajlisAuthorized(reviewer))) {
        throw new UnifiedReviewAuthorizationError();
    }

    if (certAction === 'approve' && certification?.halalEvidenceConfirmed !== true) {
        const err = new Error(
            'Issuing a certificate requires explicit confirmation that the halal evidence and certification scope were reviewed (halalEvidenceConfirmed).'
        );
        err.statusCode = 400;
        throw err;
    }

    if (certAction === 'reject' && !(certification?.rejectionReason || '').trim()) {
        const err = new Error(
            'A rejection reason is required — it is the corrections request the merchant acts on.'
        );
        err.statusCode = 400;
        throw err;
    }

    if (certAction === 'request_changes' && !(certification?.rejectionReason || '').trim()) {
        const err = new Error(
            'Requested changes require a written reason so the merchant knows what to correct.'
        );
        err.statusCode = 400;
        throw err;
    }

    // ── 1. Business decision (existing authoritative workflow) ──
    const merchant = await decideMerchantVerification(merchantId, {
        verificationStatus,
        verificationNotes,
        rejectionReason,
        reviewerId: reviewer._id,
    });

    let certificationDoc = null;
    if (merchant.halalCertification) {
        certificationDoc = await Certification.findById(merchant.halalCertification);
    }

    // ── 2. Certification decision ────────────────────────────
    if (certAction === 'approve') {
        const payload = certification || {};
        // Already-approved linked certificates flow straight into the
        // idempotent workflow below (same number, no stat change).
        let certId = certificationDoc && (CERT_REVIEWABLE.includes(certificationDoc.status) || certificationDoc.status === 'approved')
            ? certificationDoc._id
            : null;

        if (!certId) {
            // No reviewable application on file: the decision itself must
            // carry complete, validated evidence — never thin air.
            if (certificationDoc) {
                const err = new Error(
                    `The linked certification is '${certificationDoc.status}' and cannot be approved from unified review. Use the certification review queue.`
                );
                err.statusCode = 400;
                throw err;
            }
            const inputError = validateCertificationApplication({
                certificateType: payload.certificateType,
                scope: payload.scope,
                coveredProducts: payload.coveredProducts,
                documents: payload.documents,
            });
            if (inputError) {
                const err = new Error(
                    `No certification application with evidence is on file. ${inputError}`
                );
                err.statusCode = 400;
                throw err;
            }
            const created = await Certification.create({
                merchant: merchant._id,
                certificateType: payload.certificateType,
                scope: payload.scope.toString().trim(),
                coveredProducts: sanitizeCoveredProducts(payload.coveredProducts),
                documents: payload.documents,
            });
            await Merchant.findByIdAndUpdate(merchant._id, { halalCertification: created._id });
            certId = created._id;
        } else if (payload.certificateType && payload.certificateType !== certificationDoc.certificateType) {
            const err = new Error(
                `Certificate type mismatch: the application requests '${certificationDoc.certificateType}'. Review it in the certification queue to change type.`
            );
            err.statusCode = 400;
            throw err;
        }

        certificationDoc = await decideCertificationReview(certId, {
            status: 'approved',
            reviewNotes: payload.reviewNotes,
            expiryDate: payload.expiryDate,
            scope: payload.scope !== undefined ? payload.scope.toString().trim() : undefined,
            reviewerId: reviewer._id,
        });
    } else if (certAction === 'reject') {
        if (!certificationDoc || !CERT_REVIEWABLE.includes(certificationDoc.status)) {
            const err = new Error('There is no pending certification application to reject.');
            err.statusCode = 400;
            throw err;
        }
        certificationDoc = await decideCertificationReview(certificationDoc._id, {
            status: 'rejected',
            reviewNotes: certification.reviewNotes,
            rejectionReason: certification.rejectionReason,
            reviewerId: reviewer._id,
        });
    } else if (certAction === 'request_changes') {
        if (!certificationDoc || !CERT_REVIEWABLE.includes(certificationDoc.status)) {
            const err = new Error('There is no pending certification application to request changes on.');
            err.statusCode = 400;
            throw err;
        }
        const session = await mongoose.startSession();
        session.startTransaction();
        try {
            certificationDoc.reviewNotes = certification.rejectionReason.trim();
            if (certificationDoc.status === 'pending') certificationDoc.status = 'under_review';
            certificationDoc.reviewedBy = reviewer._id;
            certificationDoc.reviewedAt = new Date();
            certificationDoc.statusHistory.push({
                status: certificationDoc.status,
                changedBy: reviewer._id,
                changedAt: new Date(),
                note: `Changes requested: ${certification.rejectionReason.trim().slice(0, 900)}`,
            });
            await certificationDoc.save({ session });
            await session.commitTransaction();
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    }

    return { merchant, certification: certificationDoc, certificationAction: certAction };
};

export default decideUnifiedReview;
