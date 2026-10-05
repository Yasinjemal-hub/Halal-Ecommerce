import request from 'supertest';
import app from '../../server.js';
import Order from '../../models/Order.js';
import Product from '../../models/Product.js';
import Merchant from '../../models/Merchant.js';
import { createTestUser, createTestMerchant, createTestProduct, generateAccessToken } from '../helpers.js';
import { connectDB, disconnectDB, clearDB } from '../setup.js';

const SHIPPING = {
  fullName: 'Lifecycle User',
  phone: '+251912345678',
  street: 'Test St',
  city: 'Addis Ababa',
  region: 'Addis Ababa',
};

describe('Order lifecycle — ownership, roles, transitions', () => {
  beforeAll(connectDB);
  afterAll(disconnectDB);
  afterEach(clearDB);

  let consumer, consumerToken;
  let merchantA, merchantB, productA, productB, merchantAToken, merchantBToken;
  let admin, adminToken, superadmin, superadminToken;

  beforeEach(async () => {
    consumer = await createTestUser();
    consumerToken = generateAccessToken(consumer._id);

    merchantA = await createTestMerchant({ businessName: `Test Biz A ${Date.now()}-${Math.random().toString(36).slice(2, 7)}` });
    merchantAToken = generateAccessToken(merchantA.user._id);
    productA = await createTestProduct(merchantA.merchant._id, { stock: 50 });

    merchantB = await createTestMerchant({ businessName: `Test Biz B ${Date.now()}-${Math.random().toString(36).slice(2, 7)}` });
    merchantBToken = generateAccessToken(merchantB.user._id);
    productB = await createTestProduct(merchantB.merchant._id, { stock: 50 });

    admin = await createTestUser({ role: 'admin', email: `admin-${Date.now()}@test.com` });
    adminToken = generateAccessToken(admin._id);
    superadmin = await createTestUser({ role: 'superadmin', email: `super-${Date.now()}@test.com` });
    superadminToken = generateAccessToken(superadmin._id);
  });

  const addToCart = (token, productId, quantity = 1) =>
    request(app).post('/api/cart').set('Authorization', `Bearer ${token}`).send({ productId, quantity });

  const placeOrder = async (token = consumerToken) =>
    request(app).post('/api/orders').set('Authorization', `Bearer ${token}`).send({
      shippingAddress: SHIPPING,
      paymentMethod: 'cash_on_delivery',
    });

  const createOrderWith = async (products = [{ id: productA._id, qty: 1 }]) => {
    for (const p of products) await addToCart(consumerToken, p.id, p.qty);
    const res = await placeOrder();
    expect(res.status).toBe(201);
    return res.body.order;
  };

  const setStatus = (token, orderId, body) =>
    request(app).put(`/api/orders/${orderId}/status`).set('Authorization', `Bearer ${token}`).send(body);

  describe('merchant ownership on status mutations', () => {
    it('allows the owning merchant to advance pending -> confirmed', async () => {
      const order = await createOrderWith();
      const res = await setStatus(merchantAToken, order._id, { status: 'confirmed' });
      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('confirmed');
    });

    it('rejects a merchant that owns no item in the order (403)', async () => {
      const order = await createOrderWith(); // only merchantA items
      const res = await setStatus(merchantBToken, order._id, { status: 'confirmed' });
      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/do not own/i);
    });

    it('rejects skipped transitions for the owning merchant', async () => {
      const order = await createOrderWith();
      const res = await setStatus(merchantAToken, order._id, { status: 'shipped' });
      expect([400, 403]).toContain(res.status);
    });

    it('rejects merchant cancellation via /status (merchants move fulfilment forward only)', async () => {
      const order = await createOrderWith();
      const res = await setStatus(merchantAToken, order._id, { status: 'cancelled' });
      expect(res.status).toBe(403);
    });

    it('rejects merchant refund/return transitions', async () => {
      const order = await createOrderWith();
      for (const s of ['refunded', 'returned', 'return_requested']) {
        const res = await setStatus(merchantAToken, order._id, { status: s });
        expect([400, 403]).toContain(res.status);
      }
    });
  });

  describe('consumer / admin / superadmin access', () => {
    it('rejects consumers on PUT /:id/status (must use cancel/return endpoints)', async () => {
      const order = await createOrderWith();
      const res = await setStatus(consumerToken, order._id, { status: 'confirmed' });
      expect(res.status).toBe(403);
    });

    it('allows admin without ownership to advance orders', async () => {
      const order = await createOrderWith();
      const res = await setStatus(adminToken, order._id, { status: 'confirmed' });
      expect(res.status).toBe(200);
    });

    it('allows superadmin without ownership to advance orders', async () => {
      const order = await createOrderWith();
      const res = await setStatus(superadminToken, order._id, { status: 'confirmed' });
      expect(res.status).toBe(200);
    });

    it('rejects invalid graph transitions even for admin (confirmed -> delivered)', async () => {
      const order = await createOrderWith();
      await setStatus(adminToken, order._id, { status: 'confirmed' });
      const res = await setStatus(adminToken, order._id, { status: 'delivered' });
      expect(res.status).toBe(400);
    });
  });

  describe('idempotency + timeline', () => {
    it('treats duplicate status updates as success without duplicate timeline events', async () => {
      const order = await createOrderWith();
      await setStatus(merchantAToken, order._id, { status: 'confirmed' });
      const before = (await Order.findById(order._id)).timeline.length;
      const res = await setStatus(merchantAToken, order._id, { status: 'confirmed' });
      expect(res.status).toBe(200);
      const after = (await Order.findById(order._id)).timeline.length;
      expect(after).toBe(before);
    });

    it('records acting user + timestamp on timeline events', async () => {
      const order = await createOrderWith();
      await setStatus(merchantAToken, order._id, { status: 'confirmed' });
      const updated = await Order.findById(order._id);
      const last = updated.timeline[updated.timeline.length - 1];
      expect(last.status).toBe('confirmed');
      expect(last.updatedBy.toString()).toBe(merchantA.user._id.toString());
      expect(new Date(last.timestamp).toString()).not.toBe('Invalid Date');
    });
  });

  describe('cancellation', () => {
    it('lets the owner cancel pending orders and restores stock + merchant metrics', async () => {
      const stockBefore = (await Product.findById(productA._id)).stock;
      const merchantBefore = await Merchant.findById(merchantA.merchant._id);
      const order = await createOrderWith([{ id: productA._id, qty: 2 }]);

      const res = await request(app)
        .put(`/api/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .send({ cancelReason: 'Changed my mind' });
      expect(res.status).toBe(200);
      expect(res.body.order.status).toBe('cancelled');

      const stockAfter = (await Product.findById(productA._id)).stock;
      expect(stockAfter).toBe(stockBefore);
      const merchantAfter = await Merchant.findById(merchantA.merchant._id);
      expect(merchantAfter.totalRevenue).toBe(merchantBefore.totalRevenue);
    });

    it('is idempotent on duplicate cancel requests', async () => {
      const order = await createOrderWith();
      await request(app).put(`/api/orders/${order._id}/cancel`).set('Authorization', `Bearer ${consumerToken}`).send({});
      const stockAfterFirst = (await Product.findById(productA._id)).stock;
      const res = await request(app).put(`/api/orders/${order._id}/cancel`).set('Authorization', `Bearer ${consumerToken}`).send({});
      expect(res.status).toBe(200);
      expect((await Product.findById(productA._id)).stock).toBe(stockAfterFirst);
    });

    it('rejects cancellation after shipping', async () => {
      const order = await createOrderWith();
      await setStatus(merchantAToken, order._id, { status: 'confirmed' });
      await setStatus(merchantAToken, order._id, { status: 'processing' });
      await setStatus(merchantAToken, order._id, { status: 'shipped' });
      const res = await request(app)
        .put(`/api/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .send({});
      expect(res.status).toBe(400);
    });

    it('lets superadmin cancel on behalf of the customer', async () => {
      const order = await createOrderWith();
      const res = await request(app)
        .put(`/api/orders/${order._id}/cancel`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ cancelReason: 'Fraud review' });
      expect(res.status).toBe(200);
    });
  });

  describe('returns + refunds', () => {
    const driveToDelivered = async (orderId) => {
      const chain = ['confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];
      for (const s of chain) {
        const payload = { status: s };
        if (s === 'shipped') payload.trackingNumber = 'TRK-123';
        const res = await setStatus(merchantAToken, orderId, payload);
        expect(res.status).toBe(200);
      }
    };

    it('rejects return requests for non-delivered orders', async () => {
      const order = await createOrderWith();
      const res = await request(app)
        .put(`/api/orders/${order._id}/return`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .send({ returnReason: 'Too late' });
      expect(res.status).toBe(400);
    });

    it('supports delivered -> return_requested -> returned -> refunded with idempotent refund', async () => {
      const order = await createOrderWith();
      await driveToDelivered(order._id);

      const ret = await request(app)
        .put(`/api/orders/${order._id}/return`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .send({ returnReason: 'Wrong size' });
      expect(ret.status).toBe(200);
      expect(ret.body.order.status).toBe('return_requested');

      // duplicate return request is a safe no-op
      const ret2 = await request(app)
        .put(`/api/orders/${order._id}/return`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .send({});
      expect(ret2.status).toBe(200);

      const approved = await setStatus(adminToken, order._id, { status: 'returned' });
      expect(approved.status).toBe(200);

      const refund = await request(app)
        .put(`/api/orders/${order._id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(refund.status).toBe(200);
      expect(refund.body.order.status).toBe('refunded');
      expect(refund.body.order.paymentStatus).toBe('refunded');

      const refund2 = await request(app)
        .put(`/api/orders/${order._id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(refund2.status).toBe(200);
    });

    it('reverses merchant revenue on exceptional delivered -> refunded', async () => {
      const order = await createOrderWith();
      await driveToDelivered(order._id);
      const revenueBefore = (await Merchant.findById(merchantA.merchant._id)).totalRevenue;
      expect(revenueBefore).toBeGreaterThan(0);

      const refund = await request(app)
        .put(`/api/orders/${order._id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(refund.status).toBe(200);
      expect((await Merchant.findById(merchantA.merchant._id)).totalRevenue).toBe(0);
    });

    it('does not double-reverse revenue when refunding from returned', async () => {
      const order = await createOrderWith();
      await driveToDelivered(order._id);
      await request(app).put(`/api/orders/${order._id}/return`).set('Authorization', `Bearer ${consumerToken}`).send({});
      await setStatus(adminToken, order._id, { status: 'returned' });
      const revenueAfterReturn = (await Merchant.findById(merchantA.merchant._id)).totalRevenue;

      const refund = await request(app)
        .put(`/api/orders/${order._id}/refund`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});
      expect(refund.status).toBe(200);
      expect((await Merchant.findById(merchantA.merchant._id)).totalRevenue).toBe(revenueAfterReturn);
    });

    it('rejects merchant refunds (admin/superadmin only)', async () => {
      const order = await createOrderWith();
      await driveToDelivered(order._id);
      await request(app).put(`/api/orders/${order._id}/return`).set('Authorization', `Bearer ${consumerToken}`).send({});
      const res = await request(app)
        .put(`/api/orders/${order._id}/refund`)
        .set('Authorization', `Bearer ${merchantAToken}`)
        .send({});
      expect(res.status).toBe(403);
    });
  });

  describe('merchant-scoped order views', () => {
    it('restricts single-order view to own items without customer email', async () => {
      const order = await createOrderWith([
        { id: productA._id, qty: 1 },
        { id: productB._id, qty: 1 },
      ]);
      const res = await request(app)
        .get(`/api/orders/${order._id}`)
        .set('Authorization', `Bearer ${merchantAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.order.items).toHaveLength(1);
      expect(res.body.order.user.email).toBeUndefined();
      expect(res.body.order.user.phone).toBeDefined();
    });

    it('restricts merchant order list to own items without customer email', async () => {
      await createOrderWith([
        { id: productA._id, qty: 1 },
        { id: productB._id, qty: 1 },
      ]);
      const res = await request(app)
        .get('/api/orders/merchant/orders')
        .set('Authorization', `Bearer ${merchantAToken}`);
      expect(res.status).toBe(200);
      expect(res.body.orders.length).toBeGreaterThanOrEqual(1);
      for (const o of res.body.orders) {
        expect(o.items.length).toBeGreaterThanOrEqual(1);
        expect(o.user.email).toBeUndefined();
      }
    });
  });
});
