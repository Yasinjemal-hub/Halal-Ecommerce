import sendEmail from './sendEmail.js';

/**
 * Best-effort review-outcome notification for merchants.
 *
 * Uses the existing nodemailer mechanism (utils/sendEmail.js). It is a
 * no-op when email delivery is not configured (no EMAIL_USER), in which
 * case merchants rely on the persistent application status shown in
 * their dashboard (/merchant/register, Mejlis status card). It never
 * throws — a notification failure must never fail the review decision.
 *
 * @param {{ to?: string, businessName?: string, verificationStatus: string, rejectionReason?: string }} decision
 * @returns {Promise<'sent' | 'skipped' | 'failed'>}
 */
export const notifyVerificationDecision = async ({ to, businessName, verificationStatus, rejectionReason }) => {
    if (!process.env.EMAIL_USER || !to) {
        return 'skipped';
    }

    const prettyStatus = String(verificationStatus || '').replace(/_/g, ' ');
    const subject = `Your merchant application for "${businessName || 'your business'}" is now: ${prettyStatus}`;

    const lines = [
        `Hello,`,
        ``,
        `The Mejilis Council has updated the review status of your merchant application${businessName ? ` for "${businessName}"` : ''}.`,
        ``,
        `New status: ${prettyStatus}`,
    ];
    if (verificationStatus === 'rejected' && rejectionReason) {
        lines.push(``, `Reviewer message: ${rejectionReason}`);
    }
    if (verificationStatus === 'approved') {
        lines.push(
            ``,
            `Congratulations! Your business is approved and halal certified on this marketplace. ` +
                `Your official halal certificate has been issued automatically — view or download it from My Application.`
        );
    }
    lines.push(``, `You can follow your application status at any time from your merchant dashboard.`);

    try {
        await sendEmail({ to, subject, text: lines.join('\n') });
        return 'sent';
    } catch {
        return 'failed';
    }
};

export default notifyVerificationDecision;
