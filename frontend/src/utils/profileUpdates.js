/**
 * Profile-update request helpers (mirrors backend/utils/profileUpdates.js).
 *
 * A genuine pending request has status 'pending', a requestedAt timestamp,
 * and at least one actual requested field. Only those fields are ever
 * rendered as "requested" — unchanged, missing, or empty values are
 * omitted so reviewers can never decide on stale or phantom data.
 */

export const REVIEWED_PROFILE_FIELDS = ['firstName', 'lastName', 'email', 'phone'];

export const REVIEWED_FIELD_LABELS = {
  firstName: 'First name',
  lastName: 'Last name',
  email: 'Email',
  phone: 'Phone',
};

const hasValue = (value) => value !== undefined && value !== null && String(value).trim() !== '';

/**
 * Actual changed fields as { field, label, current, requested }.
 * A field is listed only when the request carries a real value that
 * differs from the user's current profile value.
 */
export function getChangedFields(user) {
  const pending = user?.pendingProfileUpdate;
  if (!pending || typeof pending !== 'object') return [];
  return REVIEWED_PROFILE_FIELDS.filter((field) => {
    if (!hasValue(pending[field])) return false;
    const requested = String(pending[field]).trim();
    const current = String(user[field] ?? '').trim();
    // A case-only email difference is not a real change.
    if (field === 'email') return requested.toLowerCase() !== current.toLowerCase();
    return requested !== current;
  }).map((field) => ({
    field,
    label: REVIEWED_FIELD_LABELS[field],
    current: user[field] ?? '',
    requested: pending[field],
  }));
}

/** True only for genuine, undecided requests. */
export function hasGenuinePendingRequest(user) {
  const pending = user?.pendingProfileUpdate;
  if (!pending || typeof pending !== 'object') return false;
  if (pending.status !== 'pending') return false;
  if (!pending.requestedAt) return false;
  return REVIEWED_PROFILE_FIELDS.some((field) => hasValue(pending[field]));
}

/** 'pending' | 'approved' | 'rejected' | null for the stored request. */
export function getRequestStatus(user) {
  const status = user?.pendingProfileUpdate?.status;
  return status === 'pending' || status === 'approved' || status === 'rejected' ? status : null;
}
