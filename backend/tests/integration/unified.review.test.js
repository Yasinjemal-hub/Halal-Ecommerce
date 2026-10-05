import request from 'supertest';
import app from '../../server.js';
import Certification from '../../models/Certification.js';
import { createTestUser, generateAccessToken } from '../helpers.js';
import { connectDB, disconnectDB, clearDB } from '../setup.js';

// Retired flow: the unified second-decision review no longer exists.
// Business approval is the single decision and issues the certificate.
// Legacy `certification.action` payloads are ignored.
const uniqueEmail = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
let shopCounter = 0;
const uniqueShop = () => `Unified Shop ${Date.now()}-${(shopCounter += 1)}`;

describe('Single-decision review (legacy unified payloads ignored)', () => {
    beforeAll(connectDB);
    afterAll(disconnectDB);
    afterEach(clearDB);

    let admin, adminToken, merchantUser, merchantToken;

    beforeEach(async () => {
        admin = await createTestUser({ role: 'admin', email: uniqueEmail('uadmin') });
        adminToken = generateAccessToken(admin._id);
        merchantUser = await createTestUser({ role: 'merchant', email: uniqueEmail('umerchant') });
        merchantToken = generateAccessToken(merchantUser._id);
    });

    it('approves with a legacy certification block and still issues exactly one certificate', async () => {
        const created = await request(app)
            .post('/api/mejilis/register-merchant')
            .set({ Authorization: `Bearer ${merchantToken}` })
            .send({
                businessName: uniqueShop(),
                description: 'A test halal business.',
                businessType: 'grocery',
                businessPhone: '+251911223344',
            });
        expect(created.status).toBe(201);

        const res = await request(app)
            .put(`/api/mejilis/merchants/${created.body.merchant._id}/verify`)
            .set({ Authorization: `Bearer ${adminToken}` })
            .send({ verificationStatus: 'approved', certification: { action: 'approve' } });
        expect(res.status).toBe(200);
        expect(res.body.certification.certificateNumber).toMatch(/^HC-\d{4}-[A-Z0-9]+$/);
        expect(await Certification.countDocuments({ merchant: created.body.merchant._id })).toBe(1);
    });

    it('legacy business_only/defer payloads change nothing about issuance', async () => {
        const created = await request(app)
            .post('/api/mejilis/register-merchant')
            .set({ Authorization: `Bearer ${merchantToken}` })
            .send({
                businessName: uniqueShop(),
                description: 'A test halal business.',
                businessType: 'grocery',
                businessPhone: '+251911223344',
            });
        const res = await request(app)
            .put(`/api/admin/merchants/${created.body.merchant._id}/verify`)
            .set({ Authorization: `Bearer ${adminToken}` })
            .send({ verificationStatus: 'approved', certification: { action: 'business_only' } });
        expect(res.status).toBe(200);
        expect(await Certification.countDocuments({ merchant: created.body.merchant._id })).toBe(1);
    });
});
