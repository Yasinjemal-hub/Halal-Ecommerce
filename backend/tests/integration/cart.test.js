import request from 'supertest';
import app from '../../server.js';
import Cart from '../../models/Cart.js';
import { createTestUser, createTestMerchant, createTestProduct, generateAccessToken } from '../helpers.js';
import { connectDB, disconnectDB, clearDB } from '../setup.js';

describe('Cart API - Integration Tests', () => {
  beforeAll(connectDB);
  afterAll(disconnectDB);
  afterEach(clearDB);
  let user, merchantData, product, token;

  beforeEach(async () => {
    user = await createTestUser();
    token = generateAccessToken(user._id);
    merchantData = await createTestMerchant();
    product = await createTestProduct(merchantData.merchant._id);
  });

  describe('GET /api/cart', () => {
    it('should return empty cart for new user', async () => {
      const res = await request(app)
        .get('/api/cart')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.cart.items).toEqual([]);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).get('/api/cart');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/cart', () => {
    it('should add item to cart', async () => {
      const res = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product._id, quantity: 2 });

      expect(res.status).toBe(200);
      expect(res.body.cart.items.length).toBe(1);
      expect(res.body.cart.items[0].quantity).toBe(2);
    });

    it('should return 400 with invalid product ID', async () => {
      const res = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: 'invalid', quantity: 1 });

      expect(res.status).toBe(400);
    });

    it('should increase quantity when adding existing item', async () => {
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product._id, quantity: 1 });

      const res = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product._id, quantity: 3 });

      expect(res.status).toBe(200);
      const cartItem = res.body.cart.items.find(i => i.product._id === product._id.toString());
      expect(cartItem).toBeDefined();
    });
  });

  describe('PUT /api/cart/:itemId', () => {
    it('should update cart item quantity', async () => {
      const addRes = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product._id, quantity: 1 });

      const itemId = addRes.body.cart.items[0]._id;

      const res = await request(app)
        .put(`/api/cart/${itemId}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 5 });

      expect(res.status).toBe(200);
    });

    it('should return 400 when quantity is less than 1', async () => {
      const res = await request(app)
        .put('/api/cart/507f1f77bcf86cd799439011')
        .set('Authorization', `Bearer ${token}`)
        .send({ quantity: 0 });

      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/cart/:itemId', () => {
    it('should remove item from cart', async () => {
      const addRes = await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product._id, quantity: 1 });

      const itemId = addRes.body.cart.items[0]._id;

      const res = await request(app)
        .delete(`/api/cart/${itemId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });

  describe('DELETE /api/cart', () => {
    it('should clear entire cart', async () => {
      await request(app)
        .post('/api/cart')
        .set('Authorization', `Bearer ${token}`)
        .send({ productId: product._id, quantity: 1 });

      const res = await request(app)
        .delete('/api/cart')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
    });
  });
});
