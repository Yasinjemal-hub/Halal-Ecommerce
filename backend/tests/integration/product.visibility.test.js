import request from 'supertest';
import app from '../../server.js';
import Product from '../../models/Product.js';
import { createTestUser, createTestMerchant, createTestProduct, generateAccessToken } from '../helpers.js';
import { connectDB, disconnectDB, clearDB } from '../setup.js';

/**
 * Non-approved merchants cannot sell and their products are never
 * presented publicly as available or halal verified — enforced
 * server-side, not by UI badges. Records and dates are preserved so
 * products reappear if the merchant is approved later.
 */
describe('Product visibility follows merchant approval', () => {
    beforeAll(connectDB);
    afterAll(disconnectDB);
    afterEach(clearDB);

    const stamp = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    const setupPair = async () => {
        const approved = await createTestMerchant({ businessName: `Vis Approved ${stamp()}` });
        const suspended = await createTestMerchant({ businessName: `Vis Susp ${stamp()}`, verificationStatus: 'suspended' });
        const approvedProduct = await createTestProduct(approved.merchant._id, { name: `Approved Widget ${stamp()}` });
        const hiddenProduct = await createTestProduct(suspended.merchant._id, { name: `Hidden Widget ${stamp()}` });
        return { approved, suspended, approvedProduct, hiddenProduct };
    };

    it('public listing and search exclude non-approved merchants but keep approved ones', async () => {
        const { approvedProduct, hiddenProduct } = await setupPair();

        const list = await request(app).get('/api/products?limit=100');
        expect(list.status).toBe(200);
        const ids = list.body.products.map((p) => p._id.toString());
        expect(ids).toContain(approvedProduct._id.toString());
        expect(ids).not.toContain(hiddenProduct._id.toString());

        const search = await request(app).get('/api/products/search?q=Widget&limit=100');
        const searchIds = (search.body.products || []).map((p) => p._id.toString());
        expect(searchIds).not.toContain(hiddenProduct._id.toString());
    });

    it('public product detail 404s for non-approved merchants; staff can still open it', async () => {
        const { suspended, hiddenProduct } = await setupPair();
        const admin = await createTestUser({ role: 'admin', email: `visadmin-${stamp()}@test.com` });

        const anon = await request(app).get(`/api/products/${hiddenProduct._id}`);
        expect(anon.status).toBe(404);

        // The owner also cannot see it while non-approved (dashboard shows
        // a status message instead); records stay stored.
        const owner = await request(app)
            .get(`/api/products/${hiddenProduct._id}`)
            .set('Authorization', `Bearer ${generateAccessToken(suspended.user._id)}`);
        expect(owner.status).toBe(404);

        const staff = await request(app)
            .get(`/api/products/${hiddenProduct._id}`)
            .set('Authorization', `Bearer ${generateAccessToken(admin._id)}`);
        expect(staff.status).toBe(200);
    });

    it('merchant product list is hidden from everyone but staff while non-approved', async () => {
        const { suspended, hiddenProduct } = await setupPair();
        const admin = await createTestUser({ role: 'admin', email: `visadmin2-${stamp()}@test.com` });

        const pub = await request(app).get(`/api/merchants/${suspended.merchant._id}/products`);
        expect(pub.status).toBe(200);
        expect(pub.body.products).toHaveLength(0);
        expect(pub.body.total).toBe(0);

        // Owner dashboard access is blocked with a clear message.
        const owner = await request(app)
            .get(`/api/merchants/${suspended.merchant._id}/products`)
            .set('Authorization', `Bearer ${generateAccessToken(suspended.user._id)}`);
        expect(owner.status).toBe(403);
        expect(owner.body.message).toMatch(/approved/i);

        // Staff retains management access.
        const staff = await request(app)
            .get(`/api/merchants/${suspended.merchant._id}/products`)
            .set('Authorization', `Bearer ${generateAccessToken(admin._id)}`);
        expect(staff.status).toBe(200);
        expect(staff.body.products.map((p) => p._id.toString())).toContain(hiddenProduct._id.toString());

        // Record and dates untouched.
        const stored = await Product.findById(hiddenProduct._id);
        expect(stored.createdAt.toISOString()).toBe(hiddenProduct.createdAt.toISOString());
    });

    it('non-approved merchants cannot add, edit, or delete products', async () => {
        const { suspended, hiddenProduct } = await setupPair();
        const auth = { Authorization: `Bearer ${generateAccessToken(suspended.user._id)}` };

        const create = await request(app)
            .post('/api/products')
            .set(auth)
            .send({ name: 'New Thing', description: 'd', price: 10, category: 'other', stock: 1, images: [{ url: 'http://e.com/i.jpg' }] });
        expect(create.status).toBe(403);

        const before = (await Product.findById(hiddenProduct._id)).updatedAt.toISOString();
        const update = await request(app)
            .put(`/api/products/${hiddenProduct._id}`)
            .set(auth)
            .send({ price: 999 });
        expect(update.status).toBe(403);

        const remove = await request(app)
            .delete(`/api/products/${hiddenProduct._id}`)
            .set(auth);
        expect(remove.status).toBe(403);

        // Blocked mutations changed nothing.
        const stored = await Product.findById(hiddenProduct._id);
        expect(stored.price).not.toBe(999);
        expect(stored.isDeleted).not.toBe(true);
        expect(stored.updatedAt.toISOString()).toBe(before);
    });
});
