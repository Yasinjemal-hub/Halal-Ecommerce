import request from 'supertest';
import app from '../../server.js';
import { createTestUser, createTestMerchant, createTestProduct, generateAccessToken } from '../helpers.js';
import { connectDB, disconnectDB, clearDB } from '../setup.js';

describe('Order API - Integration Tests', () => {
  beforeAll(connectDB);
  afterAll(disconnectDB);
  afterEach(clearDB);
  let user, merchantData, product, token;

  beforeEach(async () => {
    user = await createTestUser();
    token = generateAccessToken(user._id);
    merchantData = await createTestMerchant();
    product = await createTestProduct(merchantData.merchant._id, { stock: 50 });
  });

  describe('POST /api/orders', () => {
    it('should create an order from cart', async () => {
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product._id, quantity: 2 });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddress: {
            fullName: 'Test User',
            phone: '+251912345678',
            street: 'Test St',
            city: 'Addis Ababa',
            region: 'Addis Ababa',
          },
          paymentMethod: 'cash_on_delivery',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.order).toBeDefined();
      expect(res.body.order.items.length).toBe(1);
    });

    it('should return 400 when cart is empty', async () => {
      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddress: {
            fullName: 'Test User',
            phone: '+251912345678',
            street: 'Test St',
            city: 'Addis Ababa',
            region: 'Addis Ababa',
          },
          paymentMethod: 'cash_on_delivery',
        });

      expect(res.status).toBe(400);
    });

    it('should return 400 without shipping info', async () => {
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product._id, quantity: 1 });

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({ paymentMethod: 'cash_on_delivery' });

      expect(res.status).toBe(400);
    });

    it('should prevent merchants from placing orders', async () => {
      const merchantUser = await createTestUser({ role: 'merchant' });
      const merchantToken = generateAccessToken(merchantUser._id);

      const res = await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${merchantToken}`)
        .send({
          shippingAddress: {
            fullName: 'Merchant',
            phone: '+251912345678',
            street: 'Test',
            city: 'Addis Ababa',
            region: 'Addis Ababa',
          },
          paymentMethod: 'cash_on_delivery',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/orders/my-orders', () => {
    it('should return user orders', async () => {
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product._id, quantity: 1 });

      await request(app)
        .post('/api/orders')
        .set('Authorization', `Bearer ${token}`)
        .send({
          shippingAddress: {
            fullName: 'Test User',
            phone: '+251912345678',
            street: 'Test St',
            city: 'Addis Ababa',
            region: 'Addis Ababa',
          },
          paymentMethod: 'cash_on_delivery',
        });

      const res = await request(app)
        .get('/api/orders/my-orders')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.orders.length).toBeGreaterThanOrEqual(1);
    });
  });
});
