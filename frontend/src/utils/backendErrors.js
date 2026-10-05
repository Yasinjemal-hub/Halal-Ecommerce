/**
 * Backend error → localized message resolution.
 *
 * Known backend English messages map to i18n keys; anything else resolves
 * to a localized generic fallback for the call site. The UI never renders
 * arbitrary backend sentences: translators only ever see the fixed key
 * catalog, and users always see either a precise localized message or a
 * readable localized fallback.
 */

// Exact backend `message` strings mapped to catalog keys. Extend this table
// (and the matching catalog entries) when the backend adds user-facing
// error text; do not interpolate backend sentences at runtime.
const MESSAGE_MAP = {
  'Invalid email or password': 'err_invalid_credentials',
  'A user with this email already exists': 'err_email_exists',
  'Your account has been deactivated. Please contact support.': 'err_account_deactivated',
  'Invalid or expired verification token': 'err_token_invalid',
  'No user found with that email': 'err_no_user_email',
  'Failed to send reset email. Please try again later.': 'err_reset_send_failed',
  'Invalid or expired reset token': 'err_reset_token_invalid',
  'That email address is already in use.': 'err_email_in_use',
  'Requested email is already in use by another account.': 'err_approval_email_conflict',
  'No profile fields were updated.': 'err_no_changes',
  'User or pending profile update not found.': 'err_no_pending',
  'There is no pending profile update for this user.': 'err_no_pending',
  'This request has no reviewable changes and cannot be decided.': 'err_no_reviewable',
  'This request changed since you loaded it. Reload the queue and review the latest request.': 'err_request_changed',
  'Merchants cannot place orders. Use your dashboard to manage products and orders instead.': 'err_merchant_forbidden_order',
  'Your cart is empty': 'err_cart_empty',
  'Validation failed': 'err_fix_form',
  'A merchant with this business name already exists. Please choose a different name.': 'appform_name_exists',
  'A merchant with this business name already exists.': 'appform_name_exists',
};

/**
 * Resolve an axios-style error to a localized message.
 * @param {Function} t - the translate function from useLanguage()
 * @param {*} err - caught error (axios error or anything else)
 * @param {string} fallbackKey - catalog key for the call-site generic text
 */
export function backendError(t, err, fallbackKey = 'error') {
  if (!err?.response) return t('err_network');
  const key = MESSAGE_MAP[err.response?.data?.message];
  if (key) return t(key);
  return t(fallbackKey);
}

/**
 * Resolve a bare backend message string (e.g. from a redux slice) to a
 * localized message, or null when the message is not a known backend
 * string (caller then uses its own translated fallback).
 */
export function mapBackendMessage(t, message) {
  if (typeof message !== 'string' || !message) return null;
  const key = MESSAGE_MAP[message];
  return key ? t(key) : null;
}

export default backendError;
