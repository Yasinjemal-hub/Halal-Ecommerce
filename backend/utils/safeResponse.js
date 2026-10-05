/**
 * Safe Response Utilities
 * Provides consistent field filtering for API responses to prevent sensitive data exposure
 */

const USER_PUBLIC_FIELDS = [
    'firstName',
    'lastName',
    'email',
    'phone',
    'role',
    'avatar',
    'address',
    'preferredLanguage',
    'isEmailVerified',
    'isActive',
    'lastLogin',
    'createdAt',
    'updatedAt',
    // Own-account metadata: the signed-in user needs their pending
    // profile-change request (if any) and their explicit account-source
    // marker. These are never secrets (no passwords/tokens), and the
    // public helper is only used for self responses (auth/profile).
    'pendingProfileUpdate',
    'accountSource',
];

const USER_ADMIN_FIELDS = [
    ...USER_PUBLIC_FIELDS,
    'pendingProfileUpdate',
    'emailVerificationAttempts',
];

const MERCHANT_PUBLIC_FIELDS = [
    'businessName',
    'businessNameAmharic',
    'slug',
    'description',
    'businessType',
    'logo',
    'banner',
    'businessAddress',
    'businessPhone',
    'businessEmail',
    'website',
    'verificationStatus',
    'verifiedAt',
    'operatingHours',
    'socialMedia',
    'ratingsAverage',
    'ratingsCount',
    'totalProducts',
    'totalOrders',
    'totalRevenue',
    'isActive',
    'isFeatured',
    'user',
    'halalCertification',
    'createdAt',
    'updatedAt',
];

const MERCHANT_OWNER_FIELDS = [
    ...MERCHANT_PUBLIC_FIELDS,
    'governmentLicense',
    'nationalId',
    'paymentInfo',
    'verificationNotes',
    // The merchant sees the reviewer message for their own application
    // (e.g. why it was rejected). Internal admin-only data stays excluded.
    'rejectionReason',
    'applicationNotes',
];

const MERCHANT_ADMIN_FIELDS = [
    ...MERCHANT_OWNER_FIELDS,
    'applicationNotes',
    'rejectionReason',
    'verifiedBy',
];

// Admin LIST view: same as admin detail but WITHOUT identity/business
// documents, payment details, and review notes. Documents must only be
// loaded through the authenticated admin detail endpoint
// (GET /api/admin/merchants/:id), never in bulk list responses.
const MERCHANT_ADMIN_LIST_FIELDS = MERCHANT_ADMIN_FIELDS.filter(
    (f) => !['governmentLicense', 'nationalId', 'paymentInfo', 'verificationNotes', 'rejectionReason', 'applicationNotes'].includes(f)
);

const CERTIFICATION_PUBLIC_FIELDS = [
    'certificateNumber',
    'issuingAuthority',
    'certificateType',
    'status',
    'applicationDate',
    'issueDate',
    'expiryDate',
    'scope',
    'coveredProducts',
    'complianceConditions',
    'isRenewal',
    'renewalHistory',
    'createdAt',
    'updatedAt',
];

const CERTIFICATION_ADMIN_FIELDS = [
    ...CERTIFICATION_PUBLIC_FIELDS,
    'merchant',
    'documents',
    'inspections',
    'complianceNotes',
    'reviewedBy',
    'reviewedAt',
    'reviewNotes',
    'rejectionReason',
    'revocationReason',
];

const MEJILIS_PUBLIC_FIELDS = [
    'name',
    'region',
    'members',
    'totalMerchantsReviewed',
    'totalCertificationsIssued',
    'totalComplaintsResolved',
    'totalSessionsHeld',
    'isActive',
    'createdAt',
    'updatedAt',
];

const MEJILIS_ADMIN_FIELDS = [
    ...MEJILIS_PUBLIC_FIELDS,
    'sessions',
    'complaints',
];

function filterFields(obj, allowedFields) {
    if (!obj) return obj;
    const result = {};
    // Always preserve identifiers so clients can still reference resources
    for (const idField of ['_id', 'id']) {
        if (Object.prototype.hasOwnProperty.call(obj, idField)) {
            result[idField] = obj[idField];
        }
    }
    for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(obj, field)) {
            result[field] = obj[field];
        }
    }
    return result;
}

function toSafeObject(doc, allowedFields) {
    if (!doc) return doc;
    const obj = doc.toObject ? doc.toObject() : { ...doc };
    return filterFields(obj, allowedFields);
}

export const safeUserResponse = {
    public: (user) => toSafeObject(user, USER_PUBLIC_FIELDS),
    admin: (user) => toSafeObject(user, USER_ADMIN_FIELDS),
};

function sanitizeNestedMerchant(result, level) {
    if (!result || typeof result !== 'object') return result;
    // Nested user: never expose tokens; public/owner get basic profile only
    if (result.user && typeof result.user === 'object' && !(result.user instanceof String)) {
        const isDoc = result.user.toObject || result.user._id;
        if (isDoc) {
            result.user = level === 'admin'
                ? toSafeObject(result.user, USER_ADMIN_FIELDS)
                : toSafeObject(result.user, ['firstName', 'lastName', 'avatar', 'email', 'phone'].filter((f) =>
                    level === 'owner'
                        ? ['firstName', 'lastName', 'avatar', 'email', 'phone'].includes(f)
                        : ['firstName', 'lastName', 'avatar'].includes(f)
                ));
            // Owner public contact: keep email/phone only for owner/admin, strip for public
            if (level === 'public' && result.user) {
                delete result.user.email;
                delete result.user.phone;
            }
        }
    }
    // Nested certification in merchant payloads: public facts only unless admin/owner
    if (result.halalCertification && typeof result.halalCertification === 'object') {
        const isDoc = result.halalCertification.toObject || result.halalCertification._id;
        if (isDoc && level === 'public') {
            result.halalCertification = toSafeObject(result.halalCertification, CERTIFICATION_PUBLIC_FIELDS);
        }
    }
    return result;
}

export const safeMerchantResponse = {
    public: (merchant) => sanitizeNestedMerchant(toSafeObject(merchant, MERCHANT_PUBLIC_FIELDS), 'public'),
    owner: (merchant) => sanitizeNestedMerchant(toSafeObject(merchant, MERCHANT_OWNER_FIELDS), 'owner'),
    admin: (merchant) => sanitizeNestedMerchant(toSafeObject(merchant, MERCHANT_ADMIN_FIELDS), 'admin'),
    adminList: (merchant) => sanitizeNestedMerchant(toSafeObject(merchant, MERCHANT_ADMIN_LIST_FIELDS), 'admin'),
};

export const safeCertificationResponse = {
    public: (cert) => toSafeObject(cert, CERTIFICATION_PUBLIC_FIELDS),
    admin: (cert) => toSafeObject(cert, CERTIFICATION_ADMIN_FIELDS),
};

export const safeMejilisResponse = {
    public: (mejilis) => toSafeObject(mejilis, MEJILIS_PUBLIC_FIELDS),
    admin: (mejilis) => toSafeObject(mejilis, MEJILIS_ADMIN_FIELDS),
};

export {
    USER_PUBLIC_FIELDS,
    USER_ADMIN_FIELDS,
    MERCHANT_PUBLIC_FIELDS,
    MERCHANT_OWNER_FIELDS,
    MERCHANT_ADMIN_FIELDS,
    MERCHANT_ADMIN_LIST_FIELDS,
    CERTIFICATION_PUBLIC_FIELDS,
    CERTIFICATION_ADMIN_FIELDS,
    MEJILIS_PUBLIC_FIELDS,
    MEJILIS_ADMIN_FIELDS,
};