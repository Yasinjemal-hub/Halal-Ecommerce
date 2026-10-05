import request from 'supertest';
import app from '../../server.js';
import Merchant from '../../models/Merchant.js';
import Certification from '../../models/Certification.js';
import { createTestUser, createTestMerchant, generateAccessToken } from '../helpers.js';
import { connectDB, disconnectDB, clearDB } from '../setup.js';

describe('Merchant verification workspace API', () => {
  beforeAll(connectDB);
  afterAll(disconnectDB);
  afterEach(clearDB);

  let admin, adminToken, superadmin, superadminToken, consumer, consumerToken;

  const uniqueBusiness = (prefix) =>
    `${prefix} ${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const createPendingMerchant = async (overrides = {}) => {
    const { user, merchant } = await createTestMerchant({
      businessName: uniqueBusiness('Verify Biz'),
      verificationStatus: 'pending',
      ...overrides,
    });
    merchant.governmentLicense = { url: 'http://example.com/license.jpg', publicId: 'lic1' };
    merchant.nationalId = { url: 'http://example.com/national-id.jpg', publicId: 'nid1' };
    merchant.applicationNotes = 'Please review quickly, Ramadan stock incoming.';
    await merchant.save();
    return { user, merchant };
  };

  beforeEach(async () => {
    admin = await createTestUser({ role: 'admin', email: `vadmin-${Date.now()}@test.com` });
    adminToken = generateAccessToken(admin._id);
    superadmin = await createTestUser({ role: 'superadmin', email: `vsuper-${Date.now()}@test.com` });
    superadminToken = generateAccessToken(superadmin._id);
    consumer = await createTestUser();
    consumerToken = generateAccessToken(consumer._id);
  });

  describe('GET /api/admin/merchants/:id (protected detail)', () => {
    it('returns full application incl. documents and notes for admin', async () => {
      const { merchant } = await createPendingMerchant();
      const res = await request(app)
        .get(`/api/admin/merchants/${merchant._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.merchant.businessName).toBe(merchant.businessName);
      expect(res.body.merchant.governmentLicense.url).toBe('http://example.com/license.jpg');
      expect(res.body.merchant.nationalId.url).toBe('http://example.com/national-id.jpg');
      expect(res.body.merchant.applicationNotes).toContain('Ramadan');
      expect(res.body.merchant.user.email).toBeDefined();
    });

    it('returns 404 for unknown merchant', async () => {
      const res = await request(app)
        .get('/api/admin/merchants/000000000000000000000000')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(res.status).toBe(404);
    });

    it('rejects consumers and unauthenticated callers', async () => {
      const { merchant } = await createPendingMerchant();
      const forbidden = await request(app)
        .get(`/api/admin/merchants/${merchant._id}`)
        .set('Authorization', `Bearer ${consumerToken}`);
      expect(forbidden.status).toBe(403);
      const anon = await request(app).get(`/api/admin/merchants/${merchant._id}`);
      expect(anon.status).toBe(401);
    });
  });

  describe('GET /api/admin/merchants (list hardening)', () => {
    it('strips documents/payment/notes from list items but returns statusCounts', async () => {
      await createPendingMerchant();
      const res = await request(app)
        .get('/api/admin/merchants')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.statusCounts.pending).toBeGreaterThanOrEqual(1);
      for (const m of res.body.merchants) {
        expect(m.governmentLicense).toBeUndefined();
        expect(m.nationalId).toBeUndefined();
        expect(m.paymentInfo).toBeUndefined();
        expect(m.verificationNotes).toBeUndefined();
      }
    });

    it('supports server-side search, status filter, and sorting', async () => {
      const { merchant } = await createPendingMerchant();
      const byName = await request(app)
        .get(`/api/admin/merchants?search=${encodeURIComponent(merchant.businessName.slice(0, 12))}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(byName.status).toBe(200);
      expect(byName.body.total).toBeGreaterThanOrEqual(1);

      const filtered = await request(app)
        .get('/api/admin/merchants?verificationStatus=approved')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(filtered.status).toBe(200);
      for (const m of filtered.body.merchants) {
        expect(m.verificationStatus).toBe('approved');
      }
    });
  });

  describe('approval workflow consistency (admin vs mejilis)', () => {
    it('approves via admin endpoint and issues exactly one halal certificate', async () => {
      const { merchant } = await createPendingMerchant();
      const res = await request(app)
        .put(`/api/admin/merchants/${merchant._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verificationStatus: 'approved', verificationNotes: 'Docs look good' });

      expect(res.status).toBe(200);
      expect(res.body.merchant.verificationStatus).toBe('approved');
      expect(res.body.merchant.verifiedAt).toBeDefined();

      // One-approval rule: approval issues the certificate automatically.
      expect(res.body.certification?.certificateNumber).toMatch(/^HC-\d{4}-[A-Z0-9]+$/);
      const certs = await Certification.find({ merchant: merchant._id });
      expect(certs).toHaveLength(1);
      expect(certs[0].status).toBe('approved');
      const reloaded = await Merchant.findById(merchant._id);
      expect(reloaded.halalCertification).toBeDefined();
    });

    it('approves via mejilis endpoint with identical outcome and one certificate', async () => {
      const { merchant } = await createPendingMerchant();
      const res = await request(app)
        .put(`/api/mejilis/merchants/${merchant._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verificationStatus: 'approved', verificationNotes: 'Majlis review OK' });

      expect(res.status).toBe(200);
      expect(res.body.merchant.verificationStatus).toBe('approved');
      expect(res.body.certification?.certificateNumber).toMatch(/^HC-\d{4}-[A-Z0-9]+$/);
      expect(await Certification.countDocuments({ merchant: merchant._id })).toBe(1);
    });

    it('retrying approval never duplicates the certificate', async () => {
      const { merchant } = await createPendingMerchant();
      const first = await request(app)
        .put(`/api/admin/merchants/${merchant._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verificationStatus: 'approved' });
      const second = await request(app)
        .put(`/api/admin/merchants/${merchant._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verificationStatus: 'approved' });
      expect(second.status).toBe(200);
      expect(second.body.certification.certificateNumber).toBe(first.body.certification.certificateNumber);
      expect(await Certification.countDocuments({ merchant: merchant._id })).toBe(1);
    });

    it('rejection issues no certificate and suspension invalidates it', async () => {
      const pending = await createPendingMerchant();
      const rejected = await request(app)
        .put(`/api/admin/merchants/${pending.merchant._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verificationStatus: 'rejected', rejectionReason: 'Docs unclear' });
      expect(rejected.status).toBe(200);
      expect(await Certification.countDocuments({ merchant: pending.merchant._id })).toBe(0);

      const approved = await createPendingMerchant();
      await request(app)
        .put(`/api/admin/merchants/${approved.merchant._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verificationStatus: 'approved' });
      const suspended = await request(app)
        .put(`/api/admin/merchants/${approved.merchant._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verificationStatus: 'suspended', verificationNotes: 'Pending investigation' });
      expect(suspended.status).toBe(200);
      const cert = await Certification.findOne({ merchant: approved.merchant._id });
      expect(cert.status).toBe('suspended');
    });

    it('both endpoints agree when read back through either surface', async () => {
      const { merchant } = await createPendingMerchant();
      await request(app)
        .put(`/api/admin/merchants/${merchant._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verificationStatus: 'under_review' });

      const viaMejilis = await request(app)
        .get('/api/mejilis/merchants?verificationStatus=under_review')
        .set('Authorization', `Bearer ${adminToken}`);
      expect(viaMejilis.body.merchants.map((m) => m._id.toString())).toContain(merchant._id.toString());

      const viaAdmin = await request(app)
        .get(`/api/admin/merchants/${merchant._id}`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(viaAdmin.body.merchant.verificationStatus).toBe('under_review');
    });

    it('allows superadmin on mejilis verification endpoints', async () => {
      const { merchant } = await createPendingMerchant();
      const res = await request(app)
        .put(`/api/mejilis/merchants/${merchant._id}/verify`)
        .set('Authorization', `Bearer ${superadminToken}`)
        .send({ verificationStatus: 'approved' });
      expect(res.status).toBe(200);
    });
  });

  describe('rejection validation', () => {
    it('rejects rejection without a reason on both endpoints', async () => {
      const a = await createPendingMerchant();
      const adminRes = await request(app)
        .put(`/api/admin/merchants/${a.merchant._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verificationStatus: 'rejected' });
      expect(adminRes.status).toBe(400);
      expect(adminRes.body.message).toMatch(/rejection reason/i);

      const b = await createPendingMerchant();
      const mejilisRes = await request(app)
        .put(`/api/mejilis/merchants/${b.merchant._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verificationStatus: 'rejected', rejectionReason: '   ' });
      expect(mejilisRes.status).toBe(400);
    });

    it('persists rejection reason and clears it when reopened', async () => {
      const { merchant } = await createPendingMerchant();
      const rejected = await request(app)
        .put(`/api/admin/merchants/${merchant._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verificationStatus: 'rejected', rejectionReason: 'License expired' });
      expect(rejected.status).toBe(200);
      expect(rejected.body.merchant.rejectionReason).toBe('License expired');

      const reopened = await request(app)
        .put(`/api/admin/merchants/${merchant._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verificationStatus: 'under_review', verificationNotes: 'Resubmitted' });
      expect(reopened.status).toBe(200);
      expect(reopened.body.merchant.rejectionReason).toBeUndefined();
    });

    it('rejects invalid statuses and unknown merchants', async () => {
      const { merchant } = await createPendingMerchant();
      const invalid = await request(app)
        .put(`/api/admin/merchants/${merchant._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verificationStatus: 'certified' });
      expect(invalid.status).toBe(400);

      const missing = await request(app)
        .put('/api/admin/merchants/000000000000000000000000/verify')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verificationStatus: 'approved' });
      expect(missing.status).toBe(404);
    });

    it('forbids consumers from deciding', async () => {
      const { merchant } = await createPendingMerchant();
      const res = await request(app)
        .put(`/api/admin/merchants/${merchant._id}/verify`)
        .set('Authorization', `Bearer ${consumerToken}`)
        .send({ verificationStatus: 'approved' });
      expect(res.status).toBe(403);
    });

    it('supports suspension', async () => {
      const { merchant } = await createPendingMerchant();
      const res = await request(app)
        .put(`/api/admin/merchants/${merchant._id}/verify`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ verificationStatus: 'suspended', verificationNotes: 'Pending investigation' });
      expect(res.status).toBe(200);
      expect(res.body.merchant.verificationStatus).toBe('suspended');
    });
  });

  describe('public responses stay document-free', () => {
    it('GET /api/merchants/:id exposes no documents, notes, or rejection data', async () => {
      const { merchant } = await createPendingMerchant();
      await Merchant.findByIdAndUpdate(merchant._id, { rejectionReason: 'X' });
      const res = await request(app).get(`/api/merchants/${merchant._id}`);
      expect(res.status).toBe(200);
      expect(res.body.merchant.governmentLicense).toBeUndefined();
      expect(res.body.merchant.nationalId).toBeUndefined();
      expect(res.body.merchant.paymentInfo).toBeUndefined();
      expect(res.body.merchant.applicationNotes).toBeUndefined();
      expect(res.body.merchant.rejectionReason).toBeUndefined();
    });
  });
});
