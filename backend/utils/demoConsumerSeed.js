/**
 * Demo consumer + order seed plan (pure logic, no side effects on import).
 *
 * This module defines WHAT to seed — specs, date rules, and order-document
 * builders — while `scripts/seedDemoConsumers.js` performs the actual writes
 * against the development database. Keeping the plan pure makes the date
 * rules and totals testable without touching any database.
 *
 * Invariants enforced by construction:
 * - Every demo consumer is created before their orders.
 * - Every order is dated after 2026-06-27, after its consumer's creation,
 *   after its merchants' creation, and after the creation of every product
 *   it contains (latest relevant product date is the lower bound).
 * - Order/payment/shipment/delivery dates are internally consistent with
 *   the order status (monotonic timeline, deliveredAt/paidAt only when
 *   applicable).
 * - Order numbers are deterministic (`HE-DEMO26-C{i}O{j}`) so reruns reuse
 *   existing orders instead of duplicating them; existing timestamps are
 *   never rewritten.
 */

export const SEED_FLOOR_DATE = new Date('2026-06-27T00:00:00.000Z');

// Six demo consumer specs. createdAt is fixed and historical: after the
// seeded merchants/products (June 27, 2026) and before every demo order
// (August 2026+). Identity fields are seed fiction for development only.
export const DEMO_CONSUMER_SPECS = [
    { slot: 1, firstName: 'Abebe', lastName: 'Tesfaye', email: 'consumer1@demo.com', phone: '+251922000101', preferredLanguage: 'am', createdAt: new Date('2026-07-07T09:00:00.000Z') },
    { slot: 2, firstName: 'Fatima', lastName: 'Ahmed', email: 'consumer2@demo.com', phone: '+251922000102', preferredLanguage: 'en', createdAt: new Date('2026-07-08T09:00:00.000Z') },
    { slot: 3, firstName: 'Dawit', lastName: 'Haile', email: 'consumer3@demo.com', phone: '+251922000103', preferredLanguage: 'en', createdAt: new Date('2026-07-09T09:00:00.000Z') },
    { slot: 4, firstName: 'Amina', lastName: 'Yusuf', email: 'consumer4@demo.com', phone: '+251922000104', preferredLanguage: 'so', createdAt: new Date('2026-07-10T09:00:00.000Z') },
    { slot: 5, firstName: 'Chaltu', lastName: 'Bekele', email: 'consumer5@demo.com', phone: '+251922000105', preferredLanguage: 'om', createdAt: new Date('2026-07-11T09:00:00.000Z') },
    { slot: 6, firstName: 'Yonas', lastName: 'Girma', email: 'consumer6@demo.com', phone: '+251922000106', preferredLanguage: 'en', createdAt: new Date('2026-07-12T09:00:00.000Z') },
];

// Twelve orders (two per consumer). `merchants` are slots 0–5 indexing the
// six approved demo merchants in the script's deterministic order; `items`
// counts how many distinct products to take from each listed merchant.
// dayOffset is added (in days) on top of the computed lower bound.
export const DEMO_ORDER_PLAN = [
    { consumer: 1, seq: 1, merchants: [0, 1], status: 'delivered', paymentMethod: 'telebirr', paymentStatus: 'paid', dayOffset: 44 },
    { consumer: 1, seq: 2, merchants: [2], status: 'shipped', paymentMethod: 'cbe_birr', paymentStatus: 'paid', dayOffset: 47 },
    { consumer: 2, seq: 1, merchants: [1, 2], status: 'delivered', paymentMethod: 'telebirr', paymentStatus: 'paid', dayOffset: 50 },
    { consumer: 2, seq: 2, merchants: [3], status: 'processing', paymentMethod: 'amole', paymentStatus: 'paid', dayOffset: 53 },
    { consumer: 3, seq: 1, merchants: [2, 3], status: 'delivered', paymentMethod: 'bank_transfer', paymentStatus: 'paid', dayOffset: 56 },
    { consumer: 3, seq: 2, merchants: [4], status: 'confirmed', paymentMethod: 'cash_on_delivery', paymentStatus: 'pending', dayOffset: 59 },
    { consumer: 4, seq: 1, merchants: [3, 4], status: 'delivered', paymentMethod: 'telebirr', paymentStatus: 'paid', dayOffset: 62 },
    { consumer: 4, seq: 2, merchants: [5], status: 'pending', paymentMethod: 'telebirr', paymentStatus: 'pending', dayOffset: 65 },
    { consumer: 5, seq: 1, merchants: [4, 5], status: 'delivered', paymentMethod: 'cbe_birr', paymentStatus: 'paid', dayOffset: 68 },
    { consumer: 5, seq: 2, merchants: [0], status: 'shipped', paymentMethod: 'telebirr', paymentStatus: 'paid', dayOffset: 71 },
    { consumer: 6, seq: 1, merchants: [5, 0], status: 'delivered', paymentMethod: 'telebirr', paymentStatus: 'paid', dayOffset: 74 },
    { consumer: 6, seq: 2, merchants: [1], status: 'processing', paymentMethod: 'amole', paymentStatus: 'paid', dayOffset: 77 },
];

export const demoOrderNumber = (consumerSlot, seq) => `HE-DEMO26-C${consumerSlot}O${seq}`;

// Fulfilment chain per terminal status (mirrors orderTransitions order).
const STATUS_CHAINS = {
    pending: ['pending'],
    confirmed: ['pending', 'confirmed'],
    processing: ['pending', 'confirmed', 'processing'],
    shipped: ['pending', 'confirmed', 'processing', 'shipped'],
    out_for_delivery: ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery'],
    delivered: ['pending', 'confirmed', 'processing', 'shipped', 'delivered'],
};

export const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);

const maxTime = (dates) => Math.max(...dates.map((d) => new Date(d).getTime()));

/**
 * Deterministic order date: the latest of (seed floor, consumer creation,
 * each involved merchant's creation, each item product's creation) plus a
 * fixed per-order offset. Never predates anything the order depends on.
 */
export function computeOrderDate({ consumerCreatedAt, merchantDates, productDates, dayOffset }) {
    const lowerBound = maxTime([SEED_FLOOR_DATE, consumerCreatedAt, ...merchantDates, ...productDates]);
    return addDays(new Date(lowerBound), dayOffset);
}

/** 15% VAT, same rounding as the order controller. */
export const computeTax = (itemsTotal) => Math.round(itemsTotal * 0.15 * 100) / 100;

/** Delivery fee rule matching the storefront (free over 5,000 ETB). */
export const computeDeliveryFee = (itemsTotal) => (itemsTotal > 5000 ? 0 : 150);

/**
 * Build a complete, schema-valid order document (no DB access, no
 * randomness, no current timestamps). Totals follow the real order schema
 * and business rules; the timeline is monotonic and consistent with the
 * terminal status; sandbox payment references are clearly marked demo.
 */
export function buildOrderDoc({
    orderNumber,
    userId,
    consumer,
    items,
    shippingAddress,
    paymentMethod,
    paymentStatus,
    status,
    orderDate,
    merchantUserByMerchant,
}) {
    const chain = STATUS_CHAINS[status];
    if (!chain) throw new Error(`Unsupported demo order status: ${status}`);

    const orderItems = items.map(({ product, quantity, merchantId }) => {
        const price = product.discountPrice ?? product.price;
        return {
            product: product._id,
            name: product.name,
            image: product.images?.[0]?.url || product.image || '',
            price,
            quantity,
            merchant: merchantId,
        };
    });

    const itemsTotal = orderItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const deliveryFee = computeDeliveryFee(itemsTotal);
    const tax = computeTax(itemsTotal);
    const totalPrice = itemsTotal + deliveryFee + tax;

    const timeline = chain.map((s, step) => ({
        status: s,
        note: step === 0 ? 'Order placed' : `Status updated to ${s}`,
        timestamp: addDays(orderDate, step),
        updatedBy: step === 0 ? userId : merchantUserByMerchant(orderItems[Math.min(step - 1, orderItems.length - 1)].merchant),
    }));

    const doc = {
        orderNumber,
        user: userId,
        items: orderItems,
        itemsTotal,
        deliveryFee,
        tax,
        discount: 0,
        totalPrice,
        currency: 'ETB',
        shippingAddress,
        paymentMethod,
        paymentStatus,
        status,
        timeline,
        customerNote: 'Demo seed order (development only).',
        createdAt: orderDate,
        updatedAt: orderDate,
    };

    if (paymentStatus === 'paid') {
        doc.paymentDetails = {
            transactionId: `DEMO-SANDBOX-${orderNumber}`,
            paidAt: orderDate,
            paidAmount: totalPrice,
        };
    }
    if (status === 'shipped' || status === 'delivered' || status === 'out_for_delivery') {
        doc.trackingNumber = `DEMO-TRK-${orderNumber}`;
        doc.deliveryPartner = 'Demo Express';
        doc.estimatedDelivery = addDays(orderDate, 5);
    }
    if (status === 'delivered') {
        doc.deliveredAt = addDays(orderDate, 4);
    }
    void consumer;
    return doc;
}

/** Shipping address for a demo consumer (valid Ethiopian phone/city). */
export function demoShippingAddress(consumer) {
    const [firstName, lastName] = [consumer.firstName, consumer.lastName];
    return {
        fullName: `${firstName} ${lastName}`,
        phone: consumer.phone,
        street: 'Demo Street 1',
        subcity: 'Bole',
        city: 'Addis Ababa',
        region: 'Addis Ababa',
        instructions: 'Demo seed order — development only.',
    };
}
