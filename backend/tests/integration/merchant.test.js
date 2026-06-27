import request from 'supertest';
import app from '../../server.js';
import Merchant from '../../models/Merchant.js';
import { createTestUser, createTestMerchant, generateAccessToken } from '../helpers.js';
import { connectDB, disconnectDB, clearDB } from '../setup.js';

describe('Merchant API - Integration Tests', () => {
  beforeAll(connectDB);
  afterAll(disconnectDB);
  afterEach(clearDB);
  let user, merchantData, token;

  beforeEach(async () => {
    user = await createTestUser({ role: 'merchant' });
    token = generateAccessToken(user._id);
    merchantData = await createTestMerchant({ user });
  });

  describe('GET /api/merchants', () => {
    it('should list public merchants', async () => {
      const res = await request(app).get('/api/merchants');
      expect(res.status).toBe(200);
      expect(res.body.merchants.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/merchants/featured', () => {
    it('should return featured merchants', async () => {
      const res = await request(app).get('/api/merchants/featured');
      expect(res.status).toBe(200);
    });
  });

  describe('GET /api/merchants/me/profile', () => {
    it('should return merchant profile for authenticated merchant', async () => {
      const res = await request(app)
        .get('/api/merchants/me/profile')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.merchant).toBeDefined();
    });

    it('should return 401 without auth', async () => {
      const res = await request(app).get('/api/merchants/me/profile');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/merchants', () => {
    it('should create a merchant profile', async () => {
      const newUser = await createTestUser({ email: `merchant-new-${Date.now()}@test.com` });
      const newToken = generateAccessToken(newUser._id);

      const res = await request(app)
        .post('/api/merchants')
        .set('Authorization', `Bearer ${newToken}`)
        .send({
          businessName: 'New Business',
          description: 'A new business',
          businessType: 'other',
          businessPhone: '+251912345678',
        });

      expect(res.status).toBe(201);
      expect(res.body.merchant.businessName).toBe('New Business');
    });

    it('should return 400 with missing required fields', async () => {
      const res = await request(app)
        .post('/api/merchants')
        .set('Authorization', `Bearer ${token}`)
        .send({ businessName: 'Incomplete' });

      expect(res.status).toBe(400);
    });
  });
});
