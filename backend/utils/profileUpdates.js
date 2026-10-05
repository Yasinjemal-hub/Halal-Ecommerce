/**
 * Profile-update request helpers (single source of truth).
 *
 * A *genuine* pending request is defined as ALL of:
 *   1. `pendingProfileUpdate.status === 'pending'` (explicitly staged by an
 *      authenticated profile edit — never a schema default; new
 *      registrations carry no pending object at all),
 *   2. a `requestedAt` timestamp from that submission, and
 *   3. at least one actual requested field (firstName / lastName / email /
 *      phone) holding a real value.
 *
 * Anything else (empty auto-defaulted objects, decided history, malformed
 * records) must never appear in the admin review queue and must never be
 * decided upon. The same predicates back the queue query, the approval
 * guards, the cleanup script, and the frontend display logic.
 */

export const REVIEWED_PROFILE_FIELDS = ['firstName', 'lastName', 'email', 'phone'];

const EMAIL_RE = /^[a-zA-Z0-9._%-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
const PHONE_RE = /^(?:\+251|0)([79]\d{8})$/;

/** Normalize a raw submitted value: trim, lowercase email, empty → undefined. */
export function normalizeRequestedValue(field, value) {
    if (value === undefined || value === null) return undefined;
    let v = String(value).trim();
    if (v === '') return undefined;
    if (field === 'email') v = v.toLowerCase();
    return v;
}

/**
 * Validate a single requested value. Returns an error message string, or
 * null when the value is acceptable.
 */
export function validateRequestedValue(field, value) {
    if (value === undefined) return null;
    if (field === 'firstName' || field === 'lastName') {
        if (value.length > 50) {
            return `${field === 'firstName' ? 'First name' : 'Last name'} cannot exceed 50 characters.`;
        }
        return null;
    }
    if (field === 'email') {
        if (!EMAIL_RE.test(value)) return 'Requested email address is invalid.';
        return null;
    }
    if (field === 'phone') {
        if (!PHONE_RE.test(value)) return 'Requested phone number is invalid.';
        return null;
    }
    return `Unknown profile field: ${field}.`;
}

/** Fields of a pending object that hold an actual requested value. */
export function getRequestedFields(pending) {
    if (!pending || typeof pending !== 'object') return [];
    return REVIEWED_PROFILE_FIELDS.filter((field) => {
        const value = pending[field];
        return value !== undefined && value !== null && String(value).trim() !== '';
    });
}

/** True only for genuine, undecided requests (see module docblock). */
export function isGenuinePendingRequest(pending) {
    if (!pending || typeof pending !== 'object') return false;
    if (pending.status !== 'pending') return false;
    if (!pending.requestedAt) return false;
    return getRequestedFields(pending).length > 0;
}

/**
 * Mongo filter matching exactly the genuine pending requests.
 * Mirrors isGenuinePendingRequest for server-side querying.
 */
export function genuinePendingMatch(prefix = 'pendingProfileUpdate') {
    return {
        [`${prefix}.status`]: 'pending',
        [`${prefix}.requestedAt`]: { $exists: true, $ne: null },
        $or: REVIEWED_PROFILE_FIELDS.map((field) => ({
            [`${prefix}.${field}`]: { $nin: [null, ''] },
        })),
    };
}
