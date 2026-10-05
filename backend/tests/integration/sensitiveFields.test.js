import request from 'supertest';
import app from '../../server.js';
import User from '../../models/User.js';
import Merchant from '../../models/Merchant.js';
import Certification from '../../models/Certification.js';
import { createTestUser, createTestMerchant, generateAccessToken } from '../helpers.js';
import { connectDB, disconnectDB, clearDB } from '../setup.js';

describe('Sensitive Field Exclusion - Integration Tests', () => {
  beforeAll(connectDB);
  afterAll(disconnectDB);
  afterEach(clearDB);

  let consumerUser, merchantUser, adminUser;
  let consumerToken, merchantToken, adminToken;
  let testMerchant, testCertification, merchantOwnerUser, merchantOwnerToken;

  beforeEach(async () => {
    // Create test users
    consumerUser = await createTestUser({
      email: 'consumer@test.com',
      role: 'consumer',
    });
    adminUser = await createTestUser({
      email: 'admin@test.com',
      role: 'admin',
    });

    consumerToken = generateAccessToken(consumerUser._id);
    adminToken = generateAccessToken(adminUser._id);

    // Create merchant user and profile (same user) with sensitive fields populated
    const merchantData = await createTestMerchant({
      verificationStatus: 'approved',
    });
    merchantOwnerUser = merchantData.user;
    testMerchant = merchantData.merchant;
    // Populate sensitive review-workflow fields so owner/admin access can be verified
    testMerchant.governmentLicense = { url: 'http://example.com/license.jpg', publicId: 'lic123' };
    testMerchant.nationalId = { url: 'http://example.com/national-id.jpg', publicId: 'nid123' };
    testMerchant.paymentInfo = {
      bankName: 'Commercial Bank of Ethiopia',
      accountNumber: '1000123456789',
      accountHolderName: 'Test Business',
      telebirrNumber: '+251912345678',
    };
    testMerchant.verificationNotes = 'Initial review notes';
    await testMerchant.save();
    merchantOwnerToken = generateAccessToken(merchantOwnerUser._id);

    // Create merchant user for other tests (without profile)
    merchantUser = await createTestUser({
      email: 'merchant@test.com',
      role: 'merchant',
    });
    merchantToken = generateAccessToken(merchantUser._id);

    // Create certification
    testCertification = await Certification.create({
      merchant: testMerchant._id,
      certificateType: 'halal_establishment',
      status: 'approved',
      issueDate: new Date(),
      expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      scope: 'Restaurant operations',
      coveredProducts: ['Meat', 'Poultry'],
    });
  });

  describe('User endpoints - should exclude sensitive fields', () => {
    it('POST /api/auth/register should not return password, tokens, or verification fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'New',
          lastName: 'User',
          email: 'newuser@test.com',
          password: 'Test1234!',
          phone: '+251912345678',
        });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.emailVerificationToken).toBeUndefined();
      expect(res.body.user.emailVerificationExpires).toBeUndefined();
      expect(res.body.user.emailVerificationAttempts).toBeUndefined();
      expect(res.body.user.passwordResetToken).toBeUndefined();
      expect(res.body.user.passwordResetExpires).toBeUndefined();
      expect(res.body.user.refreshToken).toBeUndefined();
      expect(res.body.user.refreshTokenExpires).toBeUndefined();
    });

    it('POST /api/auth/login should not return password, tokens, or verification fields', async () => {
      // Create a user with known password for login test
      const loginUser = await createTestUser({
        email: 'logintest@test.com',
        password: 'Test1234!',
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@test.com',
          password: 'Test1234!',
        });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.emailVerificationToken).toBeUndefined();
      expect(res.body.user.emailVerificationExpires).toBeUndefined();
      expect(res.body.user.emailVerificationAttempts).toBeUndefined();
      expect(res.body.user.passwordResetToken).toBeUndefined();
      expect(res.body.user.passwordResetExpires).toBeUndefined();
      expect(res.body.user.refreshToken).toBeUndefined();
      expect(res.body.user.refreshTokenExpires).toBeUndefined();
    });

    it('GET /api/users/profile should not return sensitive fields', async () => {
      const res = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${consumerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.emailVerificationToken).toBeUndefined();
      expect(res.body.user.emailVerificationExpires).toBeUndefined();
      expect(res.body.user.emailVerificationAttempts).toBeUndefined();
      expect(res.body.user.passwordResetToken).toBeUndefined();
      expect(res.body.user.passwordResetExpires).toBeUndefined();
      expect(res.body.user.refreshToken).toBeUndefined();
      expect(res.body.user.refreshTokenExpires).toBeUndefined();
    });
  });

  describe('Merchant endpoints - should exclude sensitive fields in public responses', () => {
    it('GET /api/merchants/:id (public) should not return governmentLicense, nationalId, paymentInfo', async () => {
      const res = await request(app).get(`/api/merchants/${testMerchant._id}`);

      expect(res.status).toBe(200);
      expect(res.body.merchant).toBeDefined();
      expect(res.body.merchant.governmentLicense).toBeUndefined();
      expect(res.body.merchant.nationalId).toBeUndefined();
      expect(res.body.merchant.paymentInfo).toBeUndefined();
      expect(res.body.merchant.verificationNotes).toBeUndefined();
    });

    it('GET /api/merchants (public listing) should not return sensitive merchant fields', async () => {
      const res = await request(app).get('/api/merchants');

      expect(res.status).toBe(200);
      expect(res.body.merchants.length).toBeGreaterThan(0);
      const merchant = res.body.merchants[0];
      expect(merchant.governmentLicense).toBeUndefined();
      expect(merchant.nationalId).toBeUndefined();
      expect(merchant.paymentInfo).toBeUndefined();
      expect(merchant.verificationNotes).toBeUndefined();
    });

    it('GET /api/merchants/featured should not return sensitive merchant fields', async () => {
      const res = await request(app).get('/api/merchants/featured');

      expect(res.status).toBe(200);
      if (res.body.merchants.length > 0) {
        const merchant = res.body.merchants[0];
        expect(merchant.governmentLicense).toBeUndefined();
        expect(merchant.nationalId).toBeUndefined();
        expect(merchant.paymentInfo).toBeUndefined();
        expect(merchant.verificationNotes).toBeUndefined();
      }
    });

    it('GET /api/merchants/me/profile (owner) should include governmentLicense, nationalId, paymentInfo', async () => {
      const res = await request(app)
        .get('/api/merchants/me/profile')
        .set('Authorization', `Bearer ${merchantOwnerToken}`);

      expect(res.status).toBe(200);
      expect(res.body.merchant).toBeDefined();
      // Owner should have access to these fields (they may be empty objects if not set)
      expect(res.body.merchant.governmentLicense).toBeDefined();
      expect(res.body.merchant.nationalId).toBeDefined();
      expect(res.body.merchant.paymentInfo).toBeDefined();
    });
  });

  describe('Certification endpoints - should expose only public fields in public responses', () => {
    it('GET /api/merchants/:id (with certification) should expose only public certification fields', async () => {
      const res = await request(app).get(`/api/merchants/${testMerchant._id}`);

      expect(res.status).toBe(200);
      if (res.body.merchant.halalCertification) {
        const cert = res.body.merchant.halalCertification;
        // Public fields should be present
        expect(cert.certificateNumber).toBeDefined();
        expect(cert.issuingAuthority).toBeDefined();
        expect(cert.certificateType).toBeDefined();
        expect(cert.status).toBeDefined();
        expect(cert.issueDate).toBeDefined();
        expect(cert.expiryDate).toBeDefined();
        expect(cert.scope).toBeDefined();
        expect(cert.coveredProducts).toBeDefined();

        // Private fields should NOT be present
        expect(cert.documents).toBeUndefined();
        expect(cert.inspections).toBeUndefined();
        expect(cert.reviewNotes).toBeUndefined();
        expect(cert.rejectionReason).toBeUndefined();
        expect(cert.revocationReason).toBeUndefined();
      }
    });

    it('Admin GET /api/mejilis/certifications should include private fields for authorized reviewers', async () => {
      // Create a certification with review data
      await Certification.create({
        merchant: testMerchant._id,
        certificateType: 'halal_product',
        status: 'rejected',
        issueDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        scope: 'Product certification',
        coveredProducts: ['Spices'],
        documents: [{ name: 'license', url: 'http://example.com/doc.pdf', documentType: 'business_license' }],
        reviewNotes: 'Does not meet standards',
        rejectionReason: 'Ingredients not halal',
        reviewedBy: adminUser._id,
        reviewedAt: new Date(),
      });

      const res = await request(app)
        .get('/api/mejilis/certifications')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      expect(res.body.certifications.length).toBeGreaterThan(0);
      // Find the certification with review data
      const cert = res.body.certifications.find((c) => c.rejectionReason === 'Ingredients not halal');
      expect(cert).toBeDefined();
      // Admin should see private fields that were set
      expect(cert.reviewNotes).toBe('Does not meet standards');
      expect(cert.rejectionReason).toBe('Ingredients not halal');
      expect(cert.documents).toBeDefined();
      expect(cert.inspections).toBeDefined();
    });
  });

  describe('Admin endpoints - should include required fields for review workflows', () => {
    it('GET /api/admin/users exposes genuine pending requests without raw tokens', async () => {
      // A user with a genuine staged request exposes it to admins…
      const requester = await createTestUser({ email: 'requester-fields@test.com' });
      await User.findByIdAndUpdate(requester._id, {
        pendingProfileUpdate: {
          firstName: 'Changed',
          requestedAt: new Date(),
          status: 'pending',
        },
      });

      const res = await request(app)
        .get('/api/admin/users')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(res.status).toBe(200);
      const withRequest = res.body.users.find((u) => u.email === 'requester-fields@test.com');
      expect(withRequest.pendingProfileUpdate).toBeDefined();
      expect(withRequest.pendingProfileUpdate.firstName).toBe('Changed');
      // …but never raw tokens, and users without a request carry no
      // auto-defaulted pending object.
      for (const user of res.body.users) {
        expect(user.emailVerificationToken).toBeUndefined();
        expect(user.passwordResetToken).toBeUndefined();
        expect(user.refreshToken).toBeUndefined();
        if (user.email !== 'requester-fields@test.com') {
          expect(user.pendingProfileUpdate?.status ?? null).not.toBe('pending');
        }
      }
    });

    it('GET /api/admin/merchants list strips documents; detail endpoint includes them', async () => {
      const listRes = await request(app)
        .get('/api/admin/merchants')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(listRes.status).toBe(200);
      if (listRes.body.merchants.length > 0) {
        const merchant = listRes.body.merchants[0];
        // Bulk list responses must NOT carry identity/business documents —
        // those load only via the authenticated detail endpoint.
        expect(merchant.governmentLicense).toBeUndefined();
        expect(merchant.nationalId).toBeUndefined();
        expect(merchant.paymentInfo).toBeUndefined();
        expect(merchant.verificationNotes).toBeUndefined();

        const detailRes = await request(app)
          .get(`/api/admin/merchants/${merchant._id}`)
          .set('Authorization', `Bearer ${adminToken}`);
        expect(detailRes.status).toBe(200);
        expect(detailRes.body.merchant.governmentLicense).toBeDefined();
        expect(detailRes.body.merchant.nationalId).toBeDefined();
        expect(detailRes.body.merchant.paymentInfo).toBeDefined();
        expect(detailRes.body.merchant.verificationNotes).toBeDefined();
      }
    });
  });

  describe('Product endpoints - should use safe merchant data', () => {
    let testProduct;

    beforeEach(async () => {
      testProduct = await (await import('../../models/Product.js')).default.create({
        merchant: testMerchant._id,
        name: 'Test Product',
        description: 'A test product',
        price: 100,
        category: 'meat',
        images: [{ url: 'http://example.com/image.jpg', alt: 'Test', isDefault: true }],
        stock: 10,
        isApproved: true,
        isActive: true,
      });
    });

    it('GET /api/products should return products with safe merchant data', async () => {
      const res = await request(app).get('/api/products');

      expect(res.status).toBe(200);
      if (res.body.products.length > 0) {
        const product = res.body.products[0];
        expect(product.merchant).toBeDefined();
        expect(product.merchant.businessName).toBeDefined();
        expect(product.merchant.slug).toBeDefined();
        // Merchant sensitive fields should not be exposed
        expect(product.merchant.governmentLicense).toBeUndefined();
        expect(product.merchant.nationalId).toBeUndefined();
        expect(product.merchant.paymentInfo).toBeUndefined();
      }
    });

    it('GET /api/products/:id should return product with safe merchant data', async () => {
      const res = await request(app).get(`/api/products/${testProduct._id}`);

      expect(res.status).toBe(200);
      expect(res.body.product.merchant).toBeDefined();
      expect(res.body.product.merchant.businessName).toBeDefined();
      expect(res.body.product.merchant.governmentLicense).toBeUndefined();
      expect(res.body.product.merchant.nationalId).toBeUndefined();
      expect(res.body.product.merchant.paymentInfo).toBeUndefined();
    });
  });

  describe('Database-level select:false should work on direct queries', () => {
    it('User.findById should not include password by default', async () => {
      const user = await User.findById(consumerUser._id);
      expect(user.password).toBeUndefined();
      expect(user.emailVerificationToken).toBeUndefined();
      expect(user.passwordResetToken).toBeUndefined();
      expect(user.refreshToken).toBeUndefined();
    });

    it('Merchant public safe-response should exclude sensitive fields', async () => {
      const { safeMerchantResponse } = await import('../../utils/safeResponse.js');
      const merchant = await Merchant.findById(testMerchant._id);
      const pub = safeMerchantResponse.public(merchant);
      expect(pub.governmentLicense).toBeUndefined();
      expect(pub.nationalId).toBeUndefined();
      expect(pub.paymentInfo).toBeUndefined();
      expect(pub.verificationNotes).toBeUndefined();
    });

    it('Certification.findById should not include private review notes by default', async () => {
      const cert = await Certification.findById(testCertification._id);
      expect(cert.reviewNotes).toBeUndefined();
      expect(cert.rejectionReason).toBeUndefined();
      expect(cert.revocationReason).toBeUndefined();
    });
  });
});