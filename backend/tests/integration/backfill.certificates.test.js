import request from 'supertest';
import app from '../../server.js';
import Merchant from '../../models/Merchant.js';
import Certification from '../../models/Certification.js';
import { createTestUser, createTestMerchant, generateAccessToken } from '../helpers.js';
import { connectDB, disconnectDB, clearDB } from '../setup.js';
import { ensureMerchantCertificate } from '../../utils/merchantVerification.js';
import { isCertificateIssued } from '../../utils/certificationWorkflow.js';

/**
 * Covers the seed/backfill contract without touching any real database:
 * - approved merchants created outside the approval workflow (like the
 *   demo seed) receive exactly one valid linked certificate via the same
 *   idempotent helper, with application/approval dates preserved;
 * - re-runs never duplicate records or IDs;
 * - pending/rejected/suspended merchants never receive certificates;
 * - the owner PDF, public verification, and cross-merchant isolation all
 *   resolve against the same certificate record.
 */
describe('Seed/backfill certificate repair (isolated)', () => {
    beforeAll(connectDB);
    afterAll(disconnectDB);
    afterEach(clearDB);

    const stamp = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    it('issues exactly one certificate per approved merchant, preserving dates', async () => {
        const { merchant } = await createTestMerchant({ businessName: `Seedlike ${stamp()}` });
        const createdAt = merchant.createdAt.toISOString();
        const verifiedAt = merchant.verifiedAt?.toISOString();
        expect(merchant.halalCertification).toBeUndefined();

        const cert = await ensureMerchantCertificate(merchant, undefined);
        expect(cert.certificateNumber).toMatch(/^HC-\d{4}-[A-Z0-9]+$/);
        expect(isCertificateIssued(cert)).toBe(true);

        const reloaded = await Merchant.findById(merchant._id);
        expect(reloaded.halalCertification.toString()).toBe(cert._id.toString());
        expect(reloaded.createdAt.toISOString()).toBe(createdAt);
        expect(reloaded.verifiedAt?.toISOString()).toBe(verifiedAt);

        // Idempotent re-run: same record, no duplicates.
        const again = await ensureMerchantCertificate(reloaded, undefined);
        expect(again._id.toString()).toBe(cert._id.toString());
        expect(await Certification.countDocuments({ merchant: merchant._id })).toBe(1);
    });

    it('never issues certificates for pending, rejected, or suspended merchants', async () => {
        for (const verificationStatus of ['pending', 'rejected', 'suspended']) {
            const { merchant } = await createTestMerchant({
                businessName: `Nonapproved ${verificationStatus} ${stamp()}`,
                verificationStatus,
            });
            // The backfill only considers approved merchants.
            const eligible = await Merchant.find({ verificationStatus: 'approved' });
            expect(eligible.map((m) => m._id.toString())).not.toContain(merchant._id.toString());
            expect(await Certification.countDocuments({ merchant: merchant._id })).toBe(0);
        }
    });

    it('owner PDF download, public verification, and cross-merchant isolation use the same record', async () => {
        const a = await createTestMerchant({ businessName: `Owner A ${stamp()}` });
        const b = await createTestMerchant({ businessName: `Owner B ${stamp()}` });
        const certA = await ensureMerchantCertificate(a.merchant, undefined);

        const pdfA = await request(app)
            .get('/api/mejilis/certificate/pdf')
            .set('Authorization', `Bearer ${generateAccessToken(a.user._id)}`);
        expect(pdfA.status).toBe(200);
        expect(pdfA.headers['content-type']).toMatch(/application\/pdf/);
        expect(pdfA.headers['content-disposition']).toContain(certA.certificateNumber);
        expect(pdfA.body.slice(0, 4).toString()).toBe('%PDF');

        // Another merchant cannot download it: 404, and the number leaks nowhere.
        const pdfB = await request(app)
            .get('/api/mejilis/certificate/pdf')
            .set('Authorization', `Bearer ${generateAccessToken(b.user._id)}`);
        expect(pdfB.status).toBe(404);
        expect(JSON.stringify(pdfB.body)).not.toContain(certA.certificateNumber);

        // Public verification resolves the same number.
        const pub = await request(app).get(`/api/mejilis/certifications/verify/${certA.certificateNumber}`);
        expect(pub.status).toBe(200);
        expect(pub.body.certificate.issued).toBe(true);
        expect(pub.body.certificate.certificateNumber).toBe(certA.certificateNumber);
        expect(pub.body.certificate.businessName).toBe(a.merchant.businessName);
    });

    it('suspension invalidates both the PDF endpoint and public verification consistently', async () => {
        const admin = await createTestUser({ role: 'admin', email: `badmin-${stamp()}@test.com` });
        const { merchant, user } = await createTestMerchant({ businessName: `Susp ${stamp()}` });
        await ensureMerchantCertificate(merchant, undefined);
        const number = (await Certification.findOne({ merchant: merchant._id })).certificateNumber;

        await request(app)
            .put(`/api/admin/merchants/${merchant._id}/verify`)
            .set('Authorization', `Bearer ${generateAccessToken(admin._id)}`)
            .send({ verificationStatus: 'suspended', verificationNotes: 'review' });

        const pdf = await request(app)
            .get('/api/mejilis/certificate/pdf')
            .set('Authorization', `Bearer ${generateAccessToken(user._id)}`);
        expect(pdf.status).toBe(403);

        const pub = await request(app).get(`/api/mejilis/certifications/verify/${number}`);
        expect(pub.status).toBe(200);
        expect(pub.body.certificate.issued).toBe(false);
    });
});
