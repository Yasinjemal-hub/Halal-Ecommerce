/**
 * One-approval rule for the whole frontend: a certificate counts as
 * issued when the business is approved AND the certificate record is
 * approved with an assigned number, while unexpired. Pending, rejected,
 * or suspended businesses never appear verified.
 * Mirrors backend utils/certificationWorkflow.js.
 */
export const isCertificateIssued = (cert, merchant = null) => {
    if (!cert || cert.status !== 'approved' || !cert.certificateNumber) return false;
    if (cert.expiryDate && new Date(cert.expiryDate) <= new Date()) return false;
    if (merchant && merchant.verificationStatus !== 'approved') return false;
    return true;
};

/**
 * Store/product "Halal Verified" badge rule: same approved status and
 * certificate record. Do not show for pending, rejected, or suspended.
 */
export const isMerchantHalalVerified = (merchant) => {
    if (!merchant || merchant.verificationStatus !== 'approved') return false;
    const cert = merchant.halalCertification && typeof merchant.halalCertification === 'object'
        ? merchant.halalCertification
        : null;
    if (!cert) return false;
    return isCertificateIssued(cert, merchant);
};

export default isCertificateIssued;
