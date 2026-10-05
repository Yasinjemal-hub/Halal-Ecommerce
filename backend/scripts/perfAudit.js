/**
 * Performance audit harness (baseline + verification).
 * Spins up mongodb-memory-server + the express app in-process, seeds
 * representative data (including realistic base64 identity docs), then times
 * the representative journeys and prints ms + payload bytes + query plans.
 *
 * Usage: node scripts/perfAudit.js
 */
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Merchant from '../models/Merchant.js';
import Product from '../models/Product.js';
import Certification from '../models/Certification.js';
import Order from '../models/Order.js';

process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-at-least-32-chars!';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

const token = (id) => jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '15m' });
// ~600KB base64 identity doc, like a real uploaded license photo
const bigDoc = (seed) => ({ url: `data:image/jpeg;base64,${Buffer.from(`${seed}-`.repeat(20000)).toString('base64')}`, publicId: 'x' });

const time = async (label, fn) => {
    const t0 = process.hrtime.bigint();
    const out = await fn();
    const ms = Number(process.hrtime.bigint() - t0) / 1e6;
    const bytes = out?.bytes ?? 0;
    console.log(`${label}: ${ms.toFixed(1)} ms${bytes ? `, ${(bytes / 1024).toFixed(1)} KB` : ''}${out?.extra || ''}`);
    return { ms, ...out };
};

const { default: app } = await import('../server.js');
const replSet = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
await mongoose.connect(replSet.getUri());

// ── Seed ────────────────────────────────────────────────
const admin = await User.create({ firstName: 'A', lastName: 'D', email: 'admin@x.com', password: 'Password123!', phone: '+251911223344', role: 'admin' });
const owner = await User.create({ firstName: 'M', lastName: 'K', email: 'm@x.com', password: 'Password123!', phone: '+251922334455', role: 'merchant' });
const consumer = await User.create({ firstName: 'C', lastName: 'U', email: 'c@x.com', password: 'Password123!', phone: '+251933445566', role: 'consumer' });
const merchant = await Merchant.create({
    user: owner._id, businessName: 'Perf Test Shop', description: 'd'.repeat(200),
    businessType: 'grocery', businessPhone: '+251911223344',
    governmentLicense: bigDoc('lic'), nationalId: bigDoc('nid'),
    verificationStatus: 'approved', verifiedAt: new Date(),
});
const cert = await Certification.create({ merchant: merchant._id, certificateNumber: 'HC-2026-PERF01', status: 'approved', issueDate: new Date(), expiryDate: new Date(Date.now() + 365 * 864e5) });
merchant.halalCertification = cert._id;
await merchant.save();

const bulk = [];
for (let i = 0; i < 300; i += 1) {
    bulk.push({ merchant: merchant._id, name: `Perf Product ${i} halal beef`, description: `Quality halal product number ${i} with beef cuts`, price: 100 + i, category: 'meat', stock: 50, images: [{ url: 'http://example.com/i.jpg' }], isActive: true, isApproved: true, halalCertified: true });
}
await Product.insertMany(bulk);
// Skip orders: admin dashboard already covers the empty-orders path.

const A = `Bearer ${token(admin._id)}`;
const M = `Bearer ${token(owner._id)}`;
const agent = request(app);
const bytes = (res) => Buffer.byteLength(JSON.stringify(res.body));

console.log('── API timings (warm, in-process) ──');
// cold (first request pays model compile / connection setup)
await time('cold  GET /api/products (first hit)', async () => ({ bytes: bytes(await agent.get('/api/products?limit=20')) }));
await time('warm  GET /api/products?limit=20', async () => ({ bytes: bytes(await agent.get('/api/products?limit=20')) }));
await time('warm  GET /api/products?search=beef (regex path)', async () => ({ bytes: bytes(await agent.get('/api/products?search=beef&limit=20')) }));
await time('warm  GET /api/products/search?q=beef (text path)', async () => ({ bytes: bytes(await agent.get('/api/products/search?q=beef')) }));
await time('warm  GET /api/merchants (list)', async () => ({ bytes: bytes(await agent.get('/api/merchants?limit=20')) }));
await time('warm  GET /api/mejilis/registration-status', async () => {
    const res = await agent.get('/api/mejilis/registration-status').set('Authorization', M);
    return { bytes: bytes(res) };
});
await time('warm  GET /api/admin/dashboard', async () => ({ bytes: bytes(await agent.get('/api/admin/dashboard').set('Authorization', A)) }));
await time('warm  GET /api/mejilis/dashboard', async () => ({ bytes: bytes(await agent.get('/api/mejilis/dashboard').set('Authorization', A)) }));
await time('warm  GET /api/mejilis/merchants (admin list)', async () => ({ bytes: bytes(await agent.get('/api/mejilis/merchants?limit=8').set('Authorization', A)) }));

console.log('── Query plans ──');
const prodRegex = await Product.find({ name: { $regex: 'beef', $options: 'i' } }).explain('executionStats');
console.log(`regex name search: stage=${prodRegex.queryPlanner.winningPlan.stage}, docsExamined=${prodRegex.executionStats.totalDocsExamined}, nReturned=${prodRegex.executionStats.nReturned}`);
const prodText = await Product.find({ $text: { $search: 'beef' } }).explain('executionStats');
console.log(`text search: stage=${prodText.queryPlanner.winningPlan.stage}, docsExamined=${prodText.executionStats.totalDocsExamined}, nReturned=${prodText.executionStats.nReturned}`);
const merchStatus = await Merchant.find({ verificationStatus: 'pending' }).explain('executionStats');
console.log(`merchant status filter: stage=${merchStatus.queryPlanner.winningPlan.stage}`);

await mongoose.disconnect();
await replSet.stop();
console.log('done');
