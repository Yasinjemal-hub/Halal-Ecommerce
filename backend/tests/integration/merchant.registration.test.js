import request from 'supertest';
import app from '../../server.js';
import Merchant from '../../models/Merchant.js';
import Certification from '../../models/Certification.js';
import { createTestUser, generateAccessToken } from '../helpers.js';
import { connectDB, disconnectDB, clearDB } from '../setup.js';
import { notifyVerificationDecision } from '../../utils/notifyMerchant.js';

const uniqueEmail = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;

const validApplication = (name) => ({
  businessName: name,
  description: 'A test halal grocery store.',
  businessType: 'grocery',
  businessPhone: '+251911223344',
  businessEmail: 'shop@example.com',
  businessAddress: { city: 'Addis Ababa', region: 'Addis Ababa' },
  applicationNotes: 'Please review quickly.',
});

describe('Merchant registration, status & certificate API', () => {
  beforeAll(connectDB);
  afterAll(disconnectDB);
  afterEach(clearDB);

  let merchantUser;
  let merchantToken;
  let adminToken;

  beforeEach(async () => {
    merchantUser = await createTestUser({ role: 'merchant', email: uniqueEmail('merchant') });
    merchantToken = generateAccessToken(merchantUser._id);
    const admin = await createTestUser({ role: 'admin', email: uniqueEmail('admin') });
    adminToken = generateAccessToken(admin._id);
  });

  const auth = (token) => ({ Authorization: `Bearer ${token}` });

  describe('POST /api/mejilis/register-merchant (submission)', () => {
    it('creates a pending application with the submitted data', async () => {
      const res = await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(merchantToken))
        .send(validApplication('Sunrise Halal Grocery'));

      expect(res.status).toBe(201);
      expect(res.body.merchant.verificationStatus).toBe('pending');
      expect(res.body.merchant.businessName).toBe('Sunrise Halal Grocery');
      expect(res.body.merchant.applicationNotes).toContain('quickly');
    });

    it('rejects invalid payloads with validation errors', async () => {
      const res = await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(merchantToken))
        .send({ description: 'Missing name, type and phone' });

      expect(res.status).toBe(400);
    });

    it('rejects consumer-role accounts', async () => {
      const consumer = await createTestUser({ email: uniqueEmail('consumer') });
      const res = await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(generateAccessToken(consumer._id)))
        .send(validApplication('Consumer Shop'));

      expect(res.status).toBe(403);
    });

    it('blocks a second profile for the same user (duplicate handling)', async () => {
      await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(merchantToken))
        .send(validApplication('First Shop'));

      const res = await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(merchantToken))
        .send(validApplication('Second Shop'));

      expect(res.status).toBe(400);
      expect(await Merchant.countDocuments({ user: merchantUser._id })).toBe(1);
    });

    it('blocks a duplicate business name from another user', async () => {
      await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(merchantToken))
        .send(validApplication('Unique Name Shop'));

      const other = await createTestUser({ role: 'merchant', email: uniqueEmail('other') });
      const res = await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(generateAccessToken(other._id)))
        .send(validApplication('unique name shop'));

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already exists/i);
    });

    it('requires authentication', async () => {
      const res = await request(app)
        .post('/api/mejilis/register-merchant')
        .send(validApplication('No Auth Shop'));
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/mejilis/registration-status (persistence)', () => {
    it('reports isRegistered=false before applying', async () => {
      const res = await request(app)
        .get('/api/mejilis/registration-status')
        .set(auth(merchantToken));
      expect(res.status).toBe(200);
      expect(res.body.isRegistered).toBe(false);
    });

    it('persists the same application across calls (refresh / new login token)', async () => {
      await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(merchantToken))
        .send(validApplication('Persistent Shop'));

      const first = await request(app).get('/api/mejilis/registration-status').set(auth(merchantToken));
      // Simulate a fresh login: brand-new token, same user.
      const freshToken = generateAccessToken(merchantUser._id);
      const second = await request(app).get('/api/mejilis/registration-status').set(auth(freshToken));

      expect(first.body.isRegistered).toBe(true);
      expect(second.body.isRegistered).toBe(true);
      expect(second.body.merchant._id).toBe(first.body.merchant._id);
      expect(second.body.merchant.verificationStatus).toBe('pending');
      expect(second.body.merchant.createdAt).toBeDefined();
    });

    it('exposes the reviewer message to the owner after rejection', async () => {
      const created = await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(merchantToken))
        .send(validApplication('Rejected Shop'));

      await request(app)
        .put(`/api/admin/merchants/${created.body.merchant._id}/verify`)
        .set(auth(adminToken))
        .send({ verificationStatus: 'rejected', rejectionReason: 'License photo is unreadable' });

      const res = await request(app).get('/api/mejilis/registration-status').set(auth(merchantToken));
      expect(res.body.merchant.verificationStatus).toBe('rejected');
      expect(res.body.merchant.rejectionReason).toContain('unreadable');
    });

    it('does not leak identity documents or internal notes to the public listing', async () => {
      const created = await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(merchantToken))
        .send(validApplication('Listed Shop'));

      const res = await request(app).get(`/api/merchants/${created.body.merchant._id}`);
      expect(res.status).toBe(200);
      expect(res.body.merchant.governmentLicense).toBeUndefined();
      expect(res.body.merchant.nationalId).toBeUndefined();
      expect(res.body.merchant.rejectionReason).toBeUndefined();
    });
  });

  describe('PUT /api/mejilis/registration (resubmission policy)', () => {
    it('allows a rejected merchant to fix and resubmit back to pending', async () => {
      const created = await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(merchantToken))
        .send(validApplication('Fixable Shop'));

      await request(app)
        .put(`/api/admin/merchants/${created.body.merchant._id}/verify`)
        .set(auth(adminToken))
        .send({ verificationStatus: 'rejected', rejectionReason: 'Missing license' });

      const res = await request(app)
        .put('/api/mejilis/registration')
        .set(auth(merchantToken))
        .send({ description: 'Updated description with license attached.' });

      expect(res.status).toBe(200);
      expect(res.body.merchant.verificationStatus).toBe('pending');
      expect(res.body.merchant.rejectionReason).toBeUndefined();
      expect(res.body.merchant.description).toContain('Updated description');
      // Untouched submitted information is preserved (no data loss).
      expect(res.body.merchant.businessName).toBe('Fixable Shop');
    });

    it('allows in-place edits while pending without changing status', async () => {
      await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(merchantToken))
        .send(validApplication('Editable Shop'));

      const res = await request(app)
        .put('/api/mejilis/registration')
        .set(auth(merchantToken))
        .send({ businessPhone: '+251922334455' });

      expect(res.status).toBe(200);
      expect(res.body.merchant.verificationStatus).toBe('pending');
      expect(res.body.merchant.businessPhone).toBe('+251922334455');
      expect(res.body.merchant.businessName).toBe('Editable Shop');
    });

    it('forbids edits once approved or suspended', async () => {
      const created = await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(merchantToken))
        .send(validApplication('Approved Shop'));

      await request(app)
        .put(`/api/admin/merchants/${created.body.merchant._id}/verify`)
        .set(auth(adminToken))
        .send({ verificationStatus: 'approved' });

      const res = await request(app)
        .put('/api/mejilis/registration')
        .set(auth(merchantToken))
        .send({ description: 'Trying to edit after approval' });

      expect(res.status).toBe(403);
    });

    it('returns 404 when there is no application to update', async () => {
      const res = await request(app)
        .put('/api/mejilis/registration')
        .set(auth(merchantToken))
        .send({ description: 'Nothing here' });
      expect(res.status).toBe(404);
    });

    it('never creates a second profile via update', async () => {
      await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(merchantToken))
        .send(validApplication('Single Profile Shop'));

      await request(app).put('/api/mejilis/registration').set(auth(merchantToken)).send({ description: 'Edit one.' });
      await request(app).put('/api/mejilis/registration').set(auth(merchantToken)).send({ description: 'Edit two.' });

      expect(await Merchant.countDocuments({ user: merchantUser._id })).toBe(1);
    });
  });

  describe('approval IS certification (one-approval rule)', () => {
    it('approving the business issues the certificate automatically', async () => {
      const created = await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(merchantToken))
        .send(validApplication('Approval Only Shop'));

      const approved = await request(app)
        .put(`/api/admin/merchants/${created.body.merchant._id}/verify`)
        .set(auth(adminToken))
        .send({ verificationStatus: 'approved' });
      expect(approved.status).toBe(200);
      expect(approved.body.certification.certificateNumber).toMatch(/^HC-\d{4}-[A-Z0-9]+$/);

      const status = await request(app).get('/api/mejilis/registration-status').set(auth(merchantToken));
      expect(status.body.merchant.verificationStatus).toBe('approved');
      expect(status.body.merchant.halalCertification.certificateNumber).toBeDefined();
      expect(await Certification.countDocuments({ merchant: created.body.merchant._id })).toBe(1);

      // ...and the PDF is available immediately.
      const pdf = await request(app).get('/api/mejilis/certificate/pdf').set(auth(merchantToken));
      expect(pdf.status).toBe(200);
    });
  });

  describe('certificate PDF + public verification (single approval)', () => {
    const approveSingleFlow = async (shopName) => {
      const created = await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(merchantToken))
        .send(validApplication(shopName));
      const merchantId = created.body.merchant._id;

      const approved = await request(app)
        .put(`/api/admin/merchants/${merchantId}/verify`)
        .set(auth(adminToken))
        .send({ verificationStatus: 'approved' });
      expect(approved.status).toBe(200);
      return { merchantId, certification: approved.body.certification };
    };

    it('issues complete certificate data on business approval', async () => {
      const { certification } = await approveSingleFlow('Certified Shop');
      expect(certification.status).toBe('approved');
      expect(certification.certificateNumber).toMatch(/^HC-\d{4}-[A-Z0-9]+$/);
      expect(certification.issuingAuthority).toBeTruthy();
      expect(certification.issueDate).toBeDefined();
      expect(certification.expiryDate).toBeDefined();
    });

    it('lets the owner download the issued certificate as PDF', async () => {
      const { certification } = await approveSingleFlow('PDF Shop');
      const res = await request(app).get('/api/mejilis/certificate/pdf').set(auth(merchantToken));

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
      expect(res.headers['content-disposition']).toContain(certification.certificateNumber);
      expect(res.body.slice(0, 4).toString()).toBe('%PDF');
    });

    it('refuses the PDF when the business is not approved', async () => {
      await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(merchantToken))
        .send(validApplication('Pending Cert Shop'));

      const res = await request(app).get('/api/mejilis/certificate/pdf').set(auth(merchantToken));
      expect(res.status).toBe(404);
    });

    it('refuses the PDF to merchants without any certificate and to guests', async () => {
      await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(merchantToken))
        .send(validApplication('No Cert Shop'));

      expect((await request(app).get('/api/mejilis/certificate/pdf').set(auth(merchantToken))).status).toBe(404);
      expect((await request(app).get('/api/mejilis/certificate/pdf')).status).toBe(401);
    });

    it('publicly verifies an issued certificate with accurate fields only', async () => {
      const { certification } = await approveSingleFlow('Verified Shop');
      const res = await request(app).get(`/api/mejilis/certifications/verify/${certification.certificateNumber}`);

      expect(res.status).toBe(200);
      expect(res.body.certificate.certificateNumber).toBe(certification.certificateNumber);
      expect(res.body.certificate.businessName).toBe('Verified Shop');
      expect(res.body.certificate.issuingAuthority).toBe(certification.issuingAuthority);
      expect(res.body.certificate.issueDate).toBeDefined();
      expect(res.body.certificate.expiryDate).toBeDefined();
      expect(res.body.certificate.issued).toBe(true);
      expect(res.body.certificate.verificationUrl).toContain(certification.certificateNumber);
      // Nothing sensitive leaks through public verification.
      expect(res.body.certificate.documents).toBeUndefined();
      expect(res.body.certificate.reviewNotes).toBeUndefined();
      expect(res.body.certificate.rejectionReason).toBeUndefined();
      expect(res.body.certificate.merchant).toBeUndefined();
    });

    it('returns 404 for unknown certificate numbers', async () => {
      const res = await request(app).get('/api/mejilis/certifications/verify/HC-2099-NOPE');
      expect(res.status).toBe(404);
    });
  });

  describe('approved applications stay locked (no second form)', () => {
    const approveBusiness = async (merchantId) => {
      const res = await request(app)
        .put(`/api/admin/merchants/${merchantId}/verify`)
        .set(auth(adminToken))
        .send({ verificationStatus: 'approved' });
      expect(res.status).toBe(200);
    };

    it('approved merchants already hold their issued certificate', async () => {
      const created = await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(merchantToken))
        .send(validApplication('Legacy Shop'));
      const merchantId = created.body.merchant._id;
      await approveBusiness(merchantId);

      const merchant = await Merchant.findById(merchantId).populate('halalCertification');
      expect(merchant.halalCertification.certificateNumber).toBeDefined();
      expect(merchant.verificationStatus).toBe('approved');
    });

    it('rejects business-field edits for approved merchants', async () => {
      const created = await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(merchantToken))
        .send(validApplication('Locked Shop'));
      await approveBusiness(created.body.merchant._id);

      const res = await request(app)
        .put('/api/mejilis/registration')
        .set(auth(merchantToken))
        .send({ description: 'Sneaky business edit' });
      expect(res.status).toBe(403);
    });

    it('returns 404 for the removed standalone certification endpoints', async () => {
      const created = await request(app)
        .post('/api/mejilis/register-merchant')
        .set(auth(merchantToken))
        .send(validApplication('Gone Shop'));
      const merchantId = created.body.merchant._id;
      await approveBusiness(merchantId);

      const postRes = await request(app)
        .post(`/api/merchants/${merchantId}/certifications`)
        .set(auth(merchantToken))
        .send({ scope: 'x' });
      expect(postRes.status).toBe(404);

      const putRes = await request(app)
        .put(`/api/merchants/${merchantId}/certifications/000000000000000000000000`)
        .set(auth(merchantToken))
        .send({ scope: 'x' });
      expect(putRes.status).toBe(404);
    });
  });

  describe('outcome notifications', () => {
    it('skips email gracefully when delivery is not configured', async () => {
      const savedUser = process.env.EMAIL_USER;
      delete process.env.EMAIL_USER;
      try {
        const result = await notifyVerificationDecision({
          to: 'owner@example.com',
          businessName: 'Quiet Shop',
          verificationStatus: 'approved',
        });
        expect(result).toBe('skipped');
      } finally {
        if (savedUser !== undefined) process.env.EMAIL_USER = savedUser;
      }
    });
  });
});
