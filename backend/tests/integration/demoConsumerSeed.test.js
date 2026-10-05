import mongoose from 'mongoose';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import {
  DEMO_CONSUMER_SPECS,
  DEMO_ORDER_PLAN,
  SEED_FLOOR_DATE,
  addDays,
  buildOrderDoc,
  computeDeliveryFee,
  computeOrderDate,
  computeTax,
  demoOrderNumber,
  demoShippingAddress,
} from '../../utils/demoConsumerSeed.js';
import { createTestMerchant, createTestProduct, createTestUser } from '../helpers.js';
import { connectDB, disconnectDB, clearDB } from '../setup.js';

describe('demo consumer seed plan (pure logic)', () => {
  beforeAll(connectDB);
  afterAll(disconnectDB);
  afterEach(clearDB);

  test('plan specs are well-formed: 6 consumers, 12 orders, unique deterministic numbers', () => {
    expect(DEMO_CONSUMER_SPECS).toHaveLength(6);
    expect(DEMO_ORDER_PLAN).toHaveLength(12);
    const numbers = DEMO_ORDER_PLAN.map((o) => demoOrderNumber(o.consumer, o.seq));
    expect(new Set(numbers).size).toBe(12);
    for (const spec of DEMO_CONSUMER_SPECS) {
      expect(spec.createdAt.getTime()).toBeGreaterThan(SEED_FLOOR_DATE.getTime());
    }
    // Every one of the six merchant slots is used by at least two orders.
    const usage = [0, 0, 0, 0, 0, 0];
    for (const o of DEMO_ORDER_PLAN) for (const m of o.merchants) usage[m] += 1;
    expect(usage.every((n) => n >= 2)).toBe(true);
  });

  test('totals follow the real order schema rules (15% VAT, delivery fee)', () => {
    expect(computeTax(1000)).toBe(150);
    expect(computeDeliveryFee(4999)).toBe(150);
    expect(computeDeliveryFee(5001)).toBe(0);
  });

  test('order dates never predate consumer, merchant, product, or floor dates', async () => {
    const { merchant } = await createTestMerchant();
    const product = await createTestProduct(merchant._id, { price: 200, discountPrice: 160 });
    const consumer = await createTestUser({});

    const planEntry = DEMO_ORDER_PLAN[0];
    const orderDate = computeOrderDate({
      consumerCreatedAt: consumer.createdAt,
      merchantDates: [merchant.createdAt],
      productDates: [product.createdAt],
      dayOffset: planEntry.dayOffset,
    });
    const latestDependency = Math.max(
      SEED_FLOOR_DATE.getTime(),
      consumer.createdAt.getTime(),
      merchant.createdAt.getTime(),
      product.createdAt.getTime(),
    );
    expect(orderDate.getTime()).toBeGreaterThan(latestDependency);
  });

  test('built orders persist with consistent totals, monotonic timeline, and status-appropriate dates', async () => {
    const { user: owner, merchant } = await createTestMerchant();
    const product = await createTestProduct(merchant._id, { price: 1000 });
    const consumer = await createTestUser({});
    const orderDate = addDays(new Date(Math.max(
      consumer.createdAt.getTime(), merchant.createdAt.getTime(), product.createdAt.getTime(),
    )), 30);

    const doc = buildOrderDoc({
      orderNumber: demoOrderNumber(1, 1),
      userId: consumer._id,
      consumer,
      items: [{ product, quantity: 2, merchantId: merchant._id }],
      shippingAddress: demoShippingAddress(consumer),
      paymentMethod: 'telebirr',
      paymentStatus: 'paid',
      status: 'delivered',
      orderDate,
      merchantUserByMerchant: () => owner._id,
    });

    expect(doc.itemsTotal).toBe(2000);
    expect(doc.tax).toBe(300);
    expect(doc.totalPrice).toBe(doc.itemsTotal + doc.deliveryFee + doc.tax);
    expect(doc.createdAt.getTime()).toBe(orderDate.getTime());
    const stamps = doc.timeline.map((t) => t.timestamp.getTime());
    expect([...stamps].sort((a, b) => a - b)).toEqual(stamps);
    expect(doc.deliveredAt.getTime()).toBeGreaterThan(orderDate.getTime());
    expect(doc.paymentDetails.transactionId).toMatch(/^DEMO-SANDBOX-/);

    const [saved] = await Order.insertMany([doc]);
    expect(saved.orderNumber).toBe(demoOrderNumber(1, 1));

    // Idempotency: the deterministic order number is already taken, so a
    // rerun must reuse (skip) instead of inserting a duplicate.
    const existing = await Order.findOne({ orderNumber: demoOrderNumber(1, 1) });
    expect(existing).not.toBeNull();
    await expect(Order.insertMany([doc])).rejects.toThrow();
  });

  test('unpaid statuses carry no payment or delivery dates', async () => {
    const { merchant } = await createTestMerchant();
    const product = await createTestProduct(merchant._id, {});
    const consumer = await createTestUser({});
    const doc = buildOrderDoc({
      orderNumber: demoOrderNumber(1, 2),
      userId: consumer._id,
      consumer,
      items: [{ product, quantity: 1, merchantId: merchant._id }],
      shippingAddress: demoShippingAddress(consumer),
      paymentMethod: 'cash_on_delivery',
      paymentStatus: 'pending',
      status: 'pending',
      orderDate: addDays(new Date(), 1),
      merchantUserByMerchant: () => merchant.user,
    });
    expect(doc.paymentDetails).toBeUndefined();
    expect(doc.deliveredAt).toBeUndefined();
    expect(doc.trackingNumber).toBeUndefined();
    expect(doc.timeline).toHaveLength(1);
  });
});
