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

    it('should use clear live definitions for merchant and certification counts', async () => {
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      // approved + active, approved + inactive, pending, under_review
      await createTestMerchant({ businessName: `Active One ${stamp}` });
      const inactive = await createTestMerchant({ businessName: `Inactive One ${stamp}` });
      await (await import('../../models/Merchant.js')).default.findByIdAndUpdate(
        inactive.merchant._id,
        { isActive: false }
      );
      await createTestMerchant({ businessName: `Pending One ${stamp}`, verificationStatus: 'pending' });
      await createTestMerchant({ businessName: `Review One ${stamp}`, verificationStatus: 'under_review' });

      const res = await request(app)
        .get('/api/admin/dashboard')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const s = res.body.stats;
      expect(s.totalMerchants).toBeGreaterThanOrEqual(4);
      expect(s.needsReviewMerchants).toBe(s.pendingMerchants + s.underReviewMerchants);
      expect(s.needsReviewMerchants).toBeGreaterThanOrEqual(2);
      expect(s.activeMerchants).toBeLessThanOrEqual(s.approvedMerchants);
      // issued = approved certifications; direct fixtures bypass the
      // approval workflow so none exist here (real approvals issue one each)
      expect(s.issuedCertifications).toBe(0);
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

    it('should filter the review queue with a comma-separated status set', async () => {
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await createTestMerchant({ businessName: `Q Pending ${stamp}`, verificationStatus: 'pending' });
      await createTestMerchant({ businessName: `Q Review ${stamp}`, verificationStatus: 'under_review' });
      await createTestMerchant({ businessName: `Q Approved ${stamp}`, verificationStatus: 'approved' });

      const res = await request(app)
        .get('/api/admin/merchants?verificationStatus=pending,under_review&limit=100')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBeGreaterThanOrEqual(2);
      for (const m of res.body.merchants) {
        expect(['pending', 'under_review']).toContain(m.verificationStatus);
      }
    });

    it('should reject an invalid verification status filter', async () => {
      const res = await request(app)
        .get('/api/admin/merchants?verificationStatus=certified')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(400);
    });
  });
});
