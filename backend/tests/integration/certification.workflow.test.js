import request from 'supertest';
import app from '../../server.js';
import Merchant from '../../models/Merchant.js';
import Certification from '../../models/Certification.js';
import { createTestUser, generateAccessToken } from '../helpers.js';
import { connectDB, disconnectDB, clearDB } from '../setup.js';
import { isCertificateIssued, isMerchantHalalVerified } from '../../utils/certificationWorkflow.js';

const uniqueEmail = (prefix) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
let shopCounter = 0;
const uniqueShop = () => `Cert Shop ${Date.now()}-${(shopCounter += 1)}`;

const registerBusiness = async (merchantToken, shopName) => {
    const created = await request(app)
        .post('/api/mejilis/register-merchant')
        .set({ Authorization: `Bearer ${merchantToken}` })
        .send({
            businessName: shopName,
            description: 'A test halal business.',
            businessType: 'grocery',
            businessPhone: '+251911223344',
        });
    expect(created.status).toBe(201);
    return created.body.merchant._id;
};

describe('One-approval certification workflow (business approval = halal certified)', () => {
    beforeAll(connectDB);
    afterAll(disconnectDB);
    afterEach(clearDB);

    let admin, adminToken, merchantUser, merchantToken;

    beforeEach(async () => {
        admin = await createTestUser({ role: 'admin', email: uniqueEmail('wfadmin') });
        adminToken = generateAccessToken(admin._id);
        merchantUser = await createTestUser({ role: 'merchant', email: uniqueEmail('wfmerchant') });
        merchantToken = generateAccessToken(merchantUser._id);
    });

    it('business approval issues exactly one certificate (no second form)', async () => {
        const merchantId = await registerBusiness(merchantToken, uniqueShop());
        expect(await Certification.countDocuments({ merchant: merchantId })).toBe(0);

        const approved = await request(app)
            .put(`/api/admin/merchants/${merchantId}/verify`)
            .set({ Authorization: `Bearer ${adminToken}` })
            .send({ verificationStatus: 'approved' });
        expect(approved.status).toBe(200);
        expect(approved.body.certification.certificateNumber).toMatch(/^HC-\d{4}-[A-Z0-9]+$/);

        const cert = await Certification.findOne({ merchant: merchantId });
        expect(isCertificateIssued(cert)).toBe(true);
        const merchant = await Merchant.findById(merchantId).populate('halalCertification');
        expect(isMerchantHalalVerified(merchant)).toBe(true);
    });

    it('retrying approval never duplicates the certificate ID', async () => {
        const merchantId = await registerBusiness(merchantToken, uniqueShop());
        const first = await request(app)
            .put(`/api/admin/merchants/${merchantId}/verify`)
            .set({ Authorization: `Bearer ${adminToken}` })
            .send({ verificationStatus: 'approved' });
        const second = await request(app)
            .put(`/api/mejilis/merchants/${merchantId}/verify`)
            .set({ Authorization: `Bearer ${adminToken}` })
            .send({ verificationStatus: 'approved' });
        expect(second.body.certification.certificateNumber).toBe(first.body.certification.certificateNumber);
        expect(await Certification.countDocuments({ merchant: merchantId })).toBe(1);
    });

    it('rejected merchants get no certificate and cannot sell (product gate)', async () => {
        const merchantId = await registerBusiness(merchantToken, uniqueShop());
        await request(app)
            .put(`/api/admin/merchants/${merchantId}/verify`)
            .set({ Authorization: `Bearer ${adminToken}` })
            .send({ verificationStatus: 'rejected', rejectionReason: 'Docs unclear' });
        expect(await Certification.countDocuments({ merchant: merchantId })).toBe(0);

        const productAttempt = await request(app)
            .post('/api/products')
            .set({ Authorization: `Bearer ${merchantToken}` })
            .send({ name: 'X', description: 'Y', price: 10, category: 'meat', stock: 1 });
        expect([400, 403]).toContain(productAttempt.status);
    });

    it('suspended merchants no longer appear verified', async () => {
        const merchantId = await registerBusiness(merchantToken, uniqueShop());
        await request(app)
            .put(`/api/admin/merchants/${merchantId}/verify`)
            .set({ Authorization: `Bearer ${adminToken}` })
            .send({ verificationStatus: 'approved' });
        await request(app)
            .put(`/api/admin/merchants/${merchantId}/verify`)
            .set({ Authorization: `Bearer ${adminToken}` })
            .send({ verificationStatus: 'suspended' });

        const merchant = await Merchant.findById(merchantId).populate('halalCertification');
        expect(isMerchantHalalVerified(merchant)).toBe(false);
        expect(isCertificateIssued(merchant.halalCertification, merchant)).toBe(false);
    });

    it('owner can view and download the PDF; public verification reflects validity', async () => {
        const merchantId = await registerBusiness(merchantToken, uniqueShop());
        const approved = await request(app)
            .put(`/api/admin/merchants/${merchantId}/verify`)
            .set({ Authorization: `Bearer ${adminToken}` })
            .send({ verificationStatus: 'approved' });
        const number = approved.body.certification.certificateNumber;

        const pdf = await request(app)
            .get('/api/mejilis/certificate/pdf')
            .set({ Authorization: `Bearer ${merchantToken}` });
        expect(pdf.status).toBe(200);
        expect(pdf.headers['content-type']).toMatch(/application\/pdf/);
        expect(pdf.headers['content-disposition']).toContain(number);

        const pub = await request(app).get(`/api/mejilis/certifications/verify/${number}`);
        expect(pub.status).toBe(200);
        expect(pub.body.certificate.issued).toBe(true);
        expect(pub.body.certificate.businessName).toBeDefined();

        // After suspension the same number verifies as not issued.
        await request(app)
            .put(`/api/admin/merchants/${merchantId}/verify`)
            .set({ Authorization: `Bearer ${adminToken}` })
            .send({ verificationStatus: 'suspended' });
        const pubAfter = await request(app).get(`/api/mejilis/certifications/verify/${number}`);
        expect(pubAfter.body.certificate.issued).toBe(false);
    });

    it('separate certification review is retired (410)', async () => {
        const merchantId = await registerBusiness(merchantToken, uniqueShop());
        await request(app)
            .put(`/api/admin/merchants/${merchantId}/verify`)
            .set({ Authorization: `Bearer ${adminToken}` })
            .send({ verificationStatus: 'approved' });
        const cert = await Certification.findOne({ merchant: merchantId });
        const res = await request(app)
            .put(`/api/mejilis/certifications/${cert._id}/review`)
            .set({ Authorization: `Bearer ${adminToken}` })
            .send({ status: 'approved' });
        expect(res.status).toBe(410);
    });

    it('legacy certification payloads on registration/review are ignored, not applied', async () => {
        const created = await request(app)
            .post('/api/mejilis/register-merchant')
            .set({ Authorization: `Bearer ${merchantToken}` })
            .send({
                businessName: uniqueShop(),
                description: 'Legacy payload test.',
                businessType: 'grocery',
                businessPhone: '+251911223344',
                certification: { certificateType: 'halal_import', scope: 'x', documents: [] },
            });
        expect(created.status).toBe(201);
        expect(await Certification.countDocuments({ merchant: created.body.merchant._id })).toBe(0);

        const approved = await request(app)
            .put(`/api/admin/merchants/${created.body.merchant._id}/verify`)
            .set({ Authorization: `Bearer ${adminToken}` })
            .send({ verificationStatus: 'approved', certification: { action: 'approve' } });
        expect(approved.status).toBe(200);
        expect(await Certification.countDocuments({ merchant: created.body.merchant._id })).toBe(1);
    });
});
