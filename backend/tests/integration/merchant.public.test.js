import request from 'supertest';
import app from '../../server.js';
import Merchant from '../../models/Merchant.js';
import Certification from '../../models/Certification.js';
import { createTestUser, createTestMerchant } from '../helpers.js';
import { connectDB, disconnectDB, clearDB } from '../setup.js';

describe('Public Merchants Listing - Integration Tests', () => {
  beforeAll(connectDB);
  afterAll(disconnectDB);
  afterEach(clearDB);

  describe('GET /api/merchants visibility (same database for all)', () => {
    it('returns approved + active merchants (seeded demo and real alike), hiding pending and inactive', async () => {
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const visible = await createTestMerchant({ businessName: `Visible Store ${stamp}` });
      await createTestMerchant({ businessName: `Pending Store ${stamp}`, verificationStatus: 'pending' });
      const inactive = await createTestMerchant({ businessName: `Inactive Store ${stamp}` });
      await Merchant.findByIdAndUpdate(inactive.merchant._id, { isActive: false });

      const res = await request(app).get('/api/merchants?limit=100');

      expect(res.status).toBe(200);
      const names = res.body.merchants.map((m) => m.businessName);
      expect(names).toContain(`Visible Store ${stamp}`);
      expect(names).not.toContain(`Pending Store ${stamp}`);
      expect(names).not.toContain(`Inactive Store ${stamp}`);
      // Visible merchant record itself is untouched (no date/status rewrite)
      const stored = await Merchant.findById(visible.merchant._id);
      expect(stored.verificationStatus).toBe('approved');
      expect(stored.isActive).toBe(true);
    });

    it('rejects non-verified filter values instead of exposing unapproved records', async () => {
      const res = await request(app).get('/api/merchants?verified=false');
      expect(res.status).toBe(400);
    });

    it('supports server-side search and business-type filters with validation', async () => {
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      await createTestMerchant({ businessName: `Searchable Spices ${stamp}`, businessType: 'spice_shop' });
      await createTestMerchant({ businessName: `Other Bakery ${stamp}`, businessType: 'bakery' });

      const bySearch = await request(app).get(`/api/merchants?search=Searchable%20Spices%20${stamp}&limit=100`);
      expect(bySearch.status).toBe(200);
      expect(bySearch.body.total).toBeGreaterThanOrEqual(1);
      expect(bySearch.body.merchants.every((m) => m.verificationStatus === 'approved')).toBe(true);

      const byType = await request(app).get(`/api/merchants?businessType=spice_shop&limit=100`);
      expect(byType.status).toBe(200);
      expect(byType.body.merchants.every((m) => m.businessType === 'spice_shop')).toBe(true);

      expect((await request(app).get('/api/merchants?businessType=bogus')).status).toBe(400);
      expect((await request(app).get(`/api/merchants?search=${'x'.repeat(101)}`)).status).toBe(400);
    });

    it('paginates so later results are reachable beyond the first page', async () => {
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      for (let i = 0; i < 5; i += 1) {
        // eslint-disable-next-line no-await-in-loop
        await createTestMerchant({ businessName: `Paginated ${stamp} ${i}` });
      }

      const page1 = await request(app).get(`/api/merchants?search=Paginated%20${stamp}&limit=2&page=1`);
      const page2 = await request(app).get(`/api/merchants?search=Paginated%20${stamp}&limit=2&page=2`);

      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);
      expect(page1.body.total).toBeGreaterThanOrEqual(5);
      expect(page2.body.merchants.length).toBeGreaterThan(0);
      const ids1 = page1.body.merchants.map((m) => m._id);
      const ids2 = page2.body.merchants.map((m) => m._id);
      expect(ids2.every((id) => !ids1.includes(id))).toBe(true);
    });

    it('exposes only public merchant/owner fields in the listing', async () => {
      await createTestMerchant({ businessName: `Safe Fields ${Date.now()}` });
      const res = await request(app).get('/api/merchants?limit=5');

      expect(res.status).toBe(200);
      expect(res.body.merchants.length).toBeGreaterThan(0);
      for (const m of res.body.merchants) {
        expect(m.governmentLicense).toBeUndefined();
        expect(m.nationalId).toBeUndefined();
        expect(m.paymentInfo).toBeUndefined();
        expect(m.verificationNotes).toBeUndefined();
        expect(m.rejectionReason).toBeUndefined();
        if (m.user && typeof m.user === 'object') {
          expect(m.user.email).toBeUndefined();
          expect(m.user.phone).toBeUndefined();
        }
      }
    });

    it('carries valid certificate data for the verified badge and none otherwise', async () => {
      const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const certified = await createTestMerchant({ businessName: `Certified ${stamp}` });
      const cert = await Certification.create({
        merchant: certified.merchant._id,
        certificateNumber: `CERT-${stamp}`,
        certificateType: 'halal_establishment',
        status: 'approved',
        issueDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        scope: 'Store operations',
        coveredProducts: ['Spices'],
      });
      await Merchant.findByIdAndUpdate(certified.merchant._id, { halalCertification: cert._id });
      await createTestMerchant({ businessName: `Uncertified ${stamp}` });

      const res = await request(app).get(`/api/merchants?search=${stamp}&limit=100`);

      expect(res.status).toBe(200);
      const byName = Object.fromEntries(res.body.merchants.map((m) => [m.businessName, m]));
      expect(byName[`Certified ${stamp}`].halalCertification.certificateNumber).toBe(`CERT-${stamp}`);
      expect(byName[`Certified ${stamp}`].halalCertification.status).toBe('approved');
      expect(byName[`Uncertified ${stamp}`].halalCertification).toBeFalsy();
    });
  });
});
