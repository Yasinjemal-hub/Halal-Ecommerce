import request from 'supertest';
import app from '../../server.js';
import { createTestUser, createTestMerchant, generateAccessToken } from '../helpers.js';
import { connectDB, disconnectDB, clearDB } from '../setup.js';

describe('Admin API - Integration Tests', () => {
  beforeAll(connectDB);
  afterAll(disconnectDB);
  afterEach(clearDB);
  let adminUser, adminToken;

  beforeEach(async () => {
    adminUser = await createTestUser({ role: 'admin', email: `admin-${Date.now()}@test.com` });
    adminToken = generateAccessToken(adminUser._id);
  });

  describe('GET /api/admin/dashboard', () => {
    it('should return dashboard stats for admin', async () => {
      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.totalUsers).toBeGreaterThanOrEqual(1);
    });

    it('should return 403 for non-admin users', async () => {
      const user = await createTestUser();
      const token = generateAccessToken(user._id);

      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });
  });

  describe('GET /api/admin/users', () => {
    it('should list users with pagination', async () => {
      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.users).toBeDefined();
      expect(res.body.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PUT /api/admin/users/:id/role', () => {
    it('should update user role', async () => {
      const targetUser = await createTestUser();
      const res = await request(app)
        .put(`/api/admin/users/${targetUser._id}/role`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ role: 'merchant' });

      expect(res.status).toBe(200);
      expect(res.body.user.role).toBe('merchant');
    });
  });

  describe('PUT /api/admin/users/:id/status', () => {
    it('should toggle user active status', async () => {
      const targetUser = await createTestUser();
      const res = await request(app)
        .put(`/api/admin/users/${targetUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.isActive).toBe(false);
    });
  });

  describe('GET /api/admin/merchants', () => {
    it('should list all merchants', async () => {
      await createTestMerchant();

      const res = await request(app)
        .get('/api/admin/merchants')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.merchants).toBeDefined();
    });
  });
});
