/**
 * Single documented order status-transition table.
 *
 * This is the source of truth for the order lifecycle. It must stay aligned with:
 *  - Order schema `status` enum (backend/models/Order.js)
 *  - Route validation on PUT /api/orders/:id/status (backend/routes/orderRoutes.js)
 *  - Merchant UI advance logic (frontend MerchantDashboard)
 *  - Consumer tracking UI (frontend Orders / OrderDetails)
 *  - cancel / return / refund endpoints
 *
 * Actors:
 *  - 'consumer'  = order owner only (req.user._id === order.user).
 *                  Consumers mutate status ONLY via dedicated endpoints:
 *                  PUT /:id/cancel (pending|confirmed -> cancelled)
 *                  PUT /:id/return (delivered -> return_requested)
 *                  They are NOT authorized on PUT /:id/status.
 *  - 'merchant'  = must own >= 1 item in THIS order (items[].merchant === caller's
 *                  Merchant profile). Verified on EVERY status mutation.
 *  - 'admin' / 'superadmin' = explicit full access (no ownership check).
 *
 * Transition table: currentStatus -> [{ to, actors }]
 */
export const ORDER_STATUSES = [
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'refunded',
    'return_requested',
    'returned',
];

export const ORDER_TRANSITIONS = {
    pending: [
        { to: 'confirmed', actors: ['merchant', 'admin', 'superadmin'] },
        { to: 'cancelled', actors: ['consumer', 'admin', 'superadmin'] },
    ],
    confirmed: [
        { to: 'processing', actors: ['merchant', 'admin', 'superadmin'] },
        { to: 'cancelled', actors: ['consumer', 'admin', 'superadmin'] },
    ],
    processing: [
        { to: 'shipped', actors: ['merchant', 'admin', 'superadmin'] },
    ],
    shipped: [
        { to: 'out_for_delivery', actors: ['merchant', 'admin', 'superadmin'] },
    ],
    out_for_delivery: [
        { to: 'delivered', actors: ['merchant', 'admin', 'superadmin'] },
    ],
    delivered: [
        { to: 'return_requested', actors: ['consumer', 'admin', 'superadmin'] },
        // Exceptional direct refund (e.g. duplicate charge, failed delivery).
        // Normal path is delivered -> return_requested -> returned -> refunded.
        { to: 'refunded', actors: ['admin', 'superadmin'] },
    ],
    return_requested: [
        { to: 'returned', actors: ['admin', 'superadmin'] },
        { to: 'refunded', actors: ['admin', 'superadmin'] },
    ],
    returned: [
        { to: 'refunded', actors: ['admin', 'superadmin'] },
    ],
    cancelled: [
        // Refund after cancellation when payment was captured.
        { to: 'refunded', actors: ['admin', 'superadmin'] },
    ],
    refunded: [],
};

/** Merchant linear fulfilment chain shown in the merchant UI. */
export const MERCHANT_ADVANCE_CHAIN = {
    pending: 'confirmed',
    confirmed: 'processing',
    processing: 'shipped',
    shipped: 'out_for_delivery',
    out_for_delivery: 'delivered',
};

/**
 * Check whether `actor` may move an order from `from` to `to`.
 * @param {string} from current status
 * @param {string} to desired status
 * @param {'consumer'|'merchant'|'admin'|'superadmin'} actor
 */
export const isTransitionAllowedForActor = (from, to, actor) => {
    if (from === to) return true; // handled as idempotent no-op by callers
    const options = ORDER_TRANSITIONS[from] || [];
    return options.some((o) => o.to === to && o.actors.includes(actor));
};

/** All statuses reachable from `from` (for error messages / UI). */
export const allowedTargets = (from) => (ORDER_TRANSITIONS[from] || []).map((o) => o.to);

export default ORDER_TRANSITIONS;
