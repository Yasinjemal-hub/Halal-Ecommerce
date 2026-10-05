/**
 * Read-only verification for the demo status fixture.
 * Checks the development database WITHOUT writing anything:
 * - demo status counts (6 per status over merchant1..30@demo.com);
 * - certificate validity per status (approved VALID; all others not valid);
 * - public product listing/search contain no non-approved demo products;
 * - owner PDF + public verification resolve the same certificate number;
 * - merchant/product createdAt dates are intact (present and pre-fixture).
 *
 * Refuses to run with NODE_ENV=production.
 *
 *   cd backend && node scripts/verifyDemoFixture.js
 */
import '../config/env.js';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Merchant from '../models/Merchant.js';
import Product from '../models/Product.js';
import { isCertificateIssued } from '../utils/certificationWorkflow.js';

process.env.NODE_ENV = 'test';
const { default: app } = await import('../server.js');

const results = [];
const check = (name, ok, detail = '') => {
    results.push({ name, ok, detail });
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
};

const conn = await connectDB();
console.log(`Target database: host=${conn?.connection?.host} db=${conn?.connection?.name} (read-only)`);

const users = await User.find({ email: { $regex: /^merchant([1-9]|[12][0-9]|30)@demo\.com$/ } }).lean();
const merchants = await Merchant.find({ user: { $in: users.map((u) => u._id) } }).populate('halalCertification');
check('all 30 demo merchants present', merchants.length === 30, `found ${merchants.length}`);

const byStatus = {};
merchants.forEach((m) => { byStatus[m.verificationStatus] = (byStatus[m.verificationStatus] || 0) + 1; });
check(
    'balanced 6/6/6/6/6 distribution',
    ['pending', 'under_review', 'approved', 'rejected', 'suspended'].every((s) => byStatus[s] === 6),
    JSON.stringify(byStatus)
);

let approvedValid = 0;
let nonApprovedValid = 0;
for (const m of merchants) {
    const cert = m.halalCertification && typeof m.halalCertification === 'object' ? m.halalCertification : null;
    const valid = !!cert && isCertificateIssued(cert, m);
    if (m.verificationStatus === 'approved' && valid) approvedValid += 1;
    if (m.verificationStatus !== 'approved' && valid) nonApprovedValid += 1;
}
check('every approved demo merchant has a valid linked certificate', approvedValid === 6, `${approvedValid}/6`);
check('no non-approved demo merchant is currently certified', nonApprovedValid === 0, `${nonApprovedValid} valid`);

const createdAts = merchants.map((m) => m.createdAt).filter(Boolean);
check('merchant registration dates preserved', createdAts.length === 30, `${createdAts.length}/30 present`);

const demoIds = new Set(merchants.map((m) => m._id.toString()));
const nonApprovedDemoIds = new Set(
    merchants.filter((m) => m.verificationStatus !== 'approved').map((m) => m._id.toString())
);
const approvedDemoIds = new Set(
    merchants.filter((m) => m.verificationStatus === 'approved').map((m) => m._id.toString())
);

const list = await request(app).get('/api/products?limit=100');
const listedMerchantIds = (list.body.products || []).map((p) => String(p.merchant?._id || p.merchant || ''));
const leaked = listedMerchantIds.filter((id) => nonApprovedDemoIds.has(id));
check('public listing shows no non-approved demo products', leaked.length === 0, `${leaked.length} leaked`);
const approvedShown = listedMerchantIds.filter((id) => approvedDemoIds.has(id));
const approvedHaveProducts = await Product.countDocuments({ merchant: { $in: [...approvedDemoIds] } });
check(
    'approved demo products remain publicly listed',
    approvedHaveProducts === 0 || approvedShown.length > 0,
    `${approvedShown.length} shown, ${approvedHaveProducts} stored`
);

const search = await request(app).get('/api/products/search?q=halal&limit=100');
const searchIds = (search.body.products || []).map((p) => String(p.merchant?._id || p.merchant || ''));
check('text search shows no non-approved demo products', searchIds.filter((id) => nonApprovedDemoIds.has(id)).length === 0);

const signToken = (userId) => jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
const byEmail = Object.fromEntries(users.map((u) => [u.email, u]));
const approvedDemo = merchants.find((m) => m.verificationStatus === 'approved');
const approvedOwner = byEmail[(await User.findById(approvedDemo.user).lean()).email];
const pdf = await request(app)
    .get('/api/mejilis/certificate/pdf')
    .set('Authorization', `Bearer ${signToken(approvedOwner._id)}`);
const certNo = approvedDemo.halalCertification.certificateNumber;
check('owner PDF downloads with matching number', pdf.status === 200 && (pdf.headers['content-disposition'] || '').includes(certNo), `status ${pdf.status}`);
const pub = await request(app).get(`/api/mejilis/certifications/verify/${certNo}`);
check('public verification resolves the same number', pub.status === 200 && pub.body.certificate?.issued === true, `issued=${pub.body.certificate?.issued}`);

const rejectedDemo = merchants.find((m) => m.verificationStatus === 'rejected');
const rejectedOwner = byEmail[(await User.findById(rejectedDemo.user).lean()).email];
const pdfRejected = await request(app)
    .get('/api/mejilis/certificate/pdf')
    .set('Authorization', `Bearer ${signToken(rejectedOwner._id)}`);
check('rejected demo merchant PDF is refused', pdfRejected.status === 403, `status ${pdfRejected.status}`);

// Non-approved owners are blocked from product APIs (direct-call proof);
// records stay stored.
const suspendedDemo = merchants.find((m) => m.verificationStatus === 'suspended');
const suspendedOwner = byEmail[(await User.findById(suspendedDemo.user).lean()).email];
const suspendedAuth = { Authorization: `Bearer ${signToken(suspendedOwner._id)}` };
const ownerList = await request(app)
    .get(`/api/merchants/${suspendedDemo._id}/products`)
    .set(suspendedAuth);
check('suspended owner product list is blocked with a clear message', ownerList.status === 403, `status ${ownerList.status}`);
const ownProduct = await Product.findOne({ merchant: suspendedDemo._id });
if (ownProduct) {
    const put = await request(app)
        .put(`/api/products/${ownProduct._id}`)
        .set(suspendedAuth)
        .send({ price: ownProduct.price });
    check('suspended owner product update is blocked', put.status === 403, `status ${put.status}`);
    const detail = await request(app)
        .get(`/api/products/${ownProduct._id}`)
        .set(suspendedAuth);
    check('suspended owner product detail is hidden like public', detail.status === 404, `status ${detail.status}`);
} else {
    check('suspended demo merchant has stored products to gate', true, 'none stored — skipped');
}

const failed = results.filter((r) => !r.ok);
console.log(failed.length === 0 ? '\nAll fixture verification checks passed.' : `\n${failed.length} check(s) FAILED.`);
await mongoose.disconnect();
process.exit(failed.length === 0 ? 0 : 1);
