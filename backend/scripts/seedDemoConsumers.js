/**
 * Demo consumer + order seed: six clearly marked demo consumer accounts and
 * twelve realistic historical orders spread across the six currently
 * approved demo merchants — WITHOUT resetting or regenerating anything.
 *
 * Scope is strictly additive:
 * - Only the six approved demo merchants' existing, publicly eligible
 *   products are used (isActive, isApproved, not deleted). No merchant,
 *   product, certificate, user, or order record is modified, and no
 *   existing timestamp is rewritten. Stock/counter effects of the NEW
 *   orders are applied once via the same arithmetic as the order
 *   controller, with original updatedAt values restored in the same write.
 * - Demo consumers are identified SOLELY by the explicit
 *   `accountSource: 'demo'` marker (never by email guessing). Reruns reuse
 *   them by email without touching their timestamps.
 * - Orders carry deterministic numbers (`HE-DEMO26-C{i}O{j}`); reruns reuse
 *   existing orders instead of duplicating them or shifting their dates.
 * - Payments are sandbox-only (`DEMO-SANDBOX-*` references written
 *   directly to the database). No payment request or charge is ever made.
 *
 * Safety:
 * - Default (no flags): DRY RUN — prints the full plan. Reads only.
 * - `--apply`: writes after printing the target host/database.
 * - `--verify`: read-only post-checks (login proof, histories, merchant
 *   visibility, date invariants). Also runs automatically after --apply.
 * - Refuses to run with NODE_ENV=production. Do NOT run against a live or
 *   production database; this is for development databases only.
 *
 *   cd backend && node scripts/seedDemoConsumers.js              # dry run
 *   cd backend && node scripts/seedDemoConsumers.js --apply      # write
 *   cd backend && node scripts/seedDemoConsumers.js --verify     # checks only
 */
import '../config/env.js';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Merchant from '../models/Merchant.js';
import Product from '../models/Product.js';
import Order from '../models/Order.js';
import {
    DEMO_CONSUMER_SPECS,
    DEMO_ORDER_PLAN,
    SEED_FLOOR_DATE,
    buildOrderDoc,
    computeOrderDate,
    demoOrderNumber,
    demoShippingAddress,
} from '../utils/demoConsumerSeed.js';

// Demo sign-in secret for development only. It lives in this script (like
// the merchant demo password in seed.js) and must never be printed to logs
// or included in reports.
const DEMO_CONSUMER_PASSWORD = 'Demo1234!';

// Exact seed-owned merchant identities (the same namespace seed.js manages:
// merchant1..30@demo.com). This is seed provenance, not email guessing —
// approval status is then confirmed per merchant below, and the run aborts
// unless exactly six are currently approved.
const DEMO_MERCHANT_EMAIL = (i) => `merchant${i}@demo.com`;

const iso = (d) => (d ? new Date(d).toISOString() : '—');

const run = async () => {
    if (process.env.NODE_ENV === 'production') {
        console.error('Refusing to run the demo consumer seed with NODE_ENV=production.');
        process.exit(1);
    }
    const apply = process.argv.includes('--apply');
    const verifyOnly = process.argv.includes('--verify');

    const conn = await connectDB();
    const dbName = conn?.connection?.name || 'unknown';
    const dbHost = conn?.connection?.host || 'unknown';
    console.log(`Target database: host=${dbHost} db=${dbName}`);
    console.log(verifyOnly ? 'Mode: VERIFY (read-only)' : apply ? 'Mode: APPLY (writing demo consumers + orders)' : 'Mode: DRY RUN (no writes)');
    console.log('Scope: add consumer1..6@demo.com (accountSource=demo) + 12 HE-DEMO26-* orders only');

    // ── 1. Resolve the six currently approved demo merchants ──
    const demoUsers = await User.find({
        email: { $regex: /^merchant([1-9]|[12][0-9]|30)@demo\.com$/ },
    }).select('_id email').lean();
    const candidates = await Merchant.find({ user: { $in: demoUsers.map((u) => u._id) } })
        .select('_id businessName verificationStatus isActive createdAt user totalOrders totalRevenue updatedAt')
        .sort({ createdAt: 1 })
        .lean();
    const approved = candidates.filter((m) => m.verificationStatus === 'approved' && m.isActive);
    const ownerEmail = Object.fromEntries(demoUsers.map((u) => [String(u._id), u.email]));
    console.log(`\nApproved + active demo merchants: ${approved.length} (of ${candidates.length} seed merchants)`);
    for (const m of approved) {
        console.log(`  - ${ownerEmail[String(m.user)]} | ${m.businessName} | joined ${iso(m.createdAt)}`);
    }
    if (approved.length !== 6) {
        console.error(`\nExpected exactly 6 approved demo merchants, found ${approved.length} — aborting without changes.`);
        await mongoose.disconnect();
        process.exit(1);
    }

    // ── 2. Confirm eligible products per merchant (read-only) ──
    const eligibleByMerchant = [];
    for (const m of approved) {
        const products = await Product.find({
            merchant: m._id, isActive: true, isApproved: true, isDeleted: { $ne: true },
        })
            .select('_id name price discountPrice stock images image createdAt updatedAt')
            .sort({ createdAt: 1 })
            .lean();
        eligibleByMerchant.push({ merchant: m, products });
        console.log(`  ${m.businessName}: ${products.length} eligible product(s)`);
    }
    if (eligibleByMerchant.some((e) => e.products.length === 0)) {
        console.error('\nAn approved demo merchant has no eligible products — aborting without changes.');
        await mongoose.disconnect();
        process.exit(1);
    }
    // Deterministic pick: earliest-registered eligible products per merchant.
    const pickProducts = (merchantSlot, count) => eligibleByMerchant[merchantSlot].products.slice(0, count);

    // ── 3. Snapshot pre-existing records (for the no-change diff) ──
    const snap = async () => ({
        users: await User.find().select('_id email createdAt updatedAt role accountSource isActive').lean(),
        merchants: await Merchant.find().select('_id createdAt updatedAt verificationStatus isActive totalOrders totalRevenue').lean(),
        products: await Product.find().select('_id createdAt updatedAt stock price discountPrice isActive isApproved isDeleted').lean(),
        orders: await Order.find().select('_id orderNumber createdAt updatedAt user status totalPrice').lean(),
    });

    // ── 4. Resolve/create demo consumers (reuse without touching dates) ──
    const consumers = [];
    for (const spec of DEMO_CONSUMER_SPECS) {
        const existing = await User.findOne({ email: spec.email });
        if (existing) {
            if (existing.role !== 'consumer' || existing.accountSource !== 'demo') {
                console.error(`\n${spec.email} exists but is not a demo consumer (role=${existing.role}, source=${existing.accountSource}) — aborting without changes.`);
                await mongoose.disconnect();
                process.exit(1);
            }
            consumers.push({ spec, user: existing, created: false });
        } else {
            consumers.push({ spec, user: null, created: true });
        }
    }

    // ── 5. Build the order plan with computed dates ──
    const plans = [];
    for (const entry of DEMO_ORDER_PLAN) {
        const consumer = consumers[entry.consumer - 1];
        const consumerCreatedAt = consumer.user?.createdAt || consumer.spec.createdAt;
        const involved = entry.merchants.map((s) => eligibleByMerchant[s]);
        const items = [];
        for (const [pos, s] of entry.merchants.entries()) {
            const prods = pickProducts(s, pos === 0 ? 1 : 1);
            for (const p of prods) {
                items.push({
                    product: p,
                    quantity: ((entry.consumer + entry.seq + pos) % 2) + 1, // 1–2, deterministic
                    merchantId: eligibleByMerchant[s].merchant._id,
                });
            }
        }
        const orderDate = computeOrderDate({
            consumerCreatedAt,
            merchantDates: involved.map((e) => e.merchant.createdAt),
            productDates: items.map((i) => i.product.createdAt),
            dayOffset: entry.dayOffset,
        });
        plans.push({ entry, consumer, items, orderDate, orderNumber: demoOrderNumber(entry.consumer, entry.seq) });
    }

    console.log('\nPlanned orders (deterministic dates, all historical):');
    for (const p of plans) {
        const names = p.items.map((i) => `${i.product.name.slice(0, 28)} x${i.quantity}`).join(' + ');
        console.log(`  ${p.orderNumber} C${p.entry.consumer} [M${p.entry.merchants.map((s) => s + 1).join('+')}] ${p.entry.status} ${p.entry.paymentMethod} ${iso(p.orderDate)} :: ${names}`);
    }

    if (verifyOnly) {
        const ok = await verify(consumers, approved, eligibleByMerchant, plans, null);
        await mongoose.disconnect();
        process.exit(ok ? 0 : 1);
    }

    if (!apply) {
        console.log('\nDry run complete — no changes written. Re-run with --apply to write them.');
        await mongoose.disconnect();
        return;
    }

    const before = await snap();

    // ── 6. Write (idempotent): consumers, then orders + one-time effects ──
    let createdConsumers = 0;
    let reusedConsumers = 0;
    for (const c of consumers) {
        if (c.user) {
            reusedConsumers += 1;
            continue;
        }
        const created = await User.create({
            firstName: c.spec.firstName,
            lastName: c.spec.lastName,
            email: c.spec.email,
            password: DEMO_CONSUMER_PASSWORD,
            phone: c.spec.phone,
            role: 'consumer',
            preferredLanguage: c.spec.preferredLanguage,
            isEmailVerified: true,
            isActive: true,
            accountSource: 'demo',
            createdAt: c.spec.createdAt,
            updatedAt: c.spec.createdAt,
        });
        c.user = created;
        createdConsumers += 1;
    }
    console.log(`\nDemo consumers: ${createdConsumers} created, ${reusedConsumers} reused (dates untouched)`);

    const session = await mongoose.startSession();
    session.startTransaction();
    let createdOrders = 0;
    let reusedOrders = 0;
    try {
        for (const p of plans) {
            const already = await Order.findOne({ orderNumber: p.orderNumber }).session(session);
            if (already) {
                if (String(already.user) !== String(p.consumer.user._id)) {
                    throw new Error(`${p.orderNumber} is owned by an unexpected user — aborting to protect data.`);
                }
                reusedOrders += 1;
                continue;
            }
            const merchantUserByMerchant = (merchantId) => {
                const slot = eligibleByMerchant.findIndex((e) => String(e.merchant._id) === String(merchantId));
                return eligibleByMerchant[slot].merchant.user;
            };
            const doc = buildOrderDoc({
                orderNumber: p.orderNumber,
                userId: p.consumer.user._id,
                consumer: p.consumer.user,
                items: p.items,
                shippingAddress: demoShippingAddress(p.consumer.spec),
                paymentMethod: p.entry.paymentMethod,
                paymentStatus: p.entry.paymentStatus,
                status: p.entry.status,
                orderDate: p.orderDate,
                merchantUserByMerchant,
            });
            await Order.insertMany([doc], { session });

            // One-time business effects (same arithmetic as the order
            // controller). Original updatedAt values are restored in the
            // same write so existing product/merchant timestamps are
            // preserved; only stock and counters move.
            for (const item of p.items) {
                const prod = await Product.findById(item.product._id).select('updatedAt stock').session(session);
                if (!prod || prod.stock < item.quantity) {
                    throw new Error(`Insufficient stock for ${p.orderNumber} — aborting to protect data.`);
                }
                await Product.updateOne(
                    { _id: item.product._id },
                    { $inc: { stock: -item.quantity }, $set: { updatedAt: prod.updatedAt } },
                    { session },
                );
            }
            const merchantTotals = new Map();
            for (const item of doc.items) {
                const key = String(item.merchant);
                merchantTotals.set(key, (merchantTotals.get(key) || 0) + item.price * item.quantity);
            }
            for (const [merchantId, subtotal] of merchantTotals) {
                const merch = await Merchant.findById(merchantId).select('updatedAt').session(session);
                await Merchant.updateOne(
                    { _id: merchantId },
                    { $inc: { totalOrders: 1, totalRevenue: subtotal }, $set: { updatedAt: merch.updatedAt } },
                    { session },
                );
            }
            createdOrders += 1;
            console.log(`  inserted ${p.orderNumber} (${p.entry.status}, ${doc.items.length} item(s))`);
        }
        await session.commitTransaction();
    } catch (err) {
        try { await session.abortTransaction(); } catch { /* noop */ }
        console.error(`\nOrder seeding failed, transaction rolled back: ${err.message}`);
        await session.endSession();
        await mongoose.disconnect();
        process.exit(1);
    }
    await session.endSession();
    console.log(`\nOrders: ${createdOrders} created, ${reusedOrders} reused (dates untouched)`);

    // ── 7. Post-write verification + no-change diff ──
    const after = await snap();
    const ok = await verify(consumers, approved, eligibleByMerchant, plans, { before, after });
    await mongoose.disconnect();
    process.exit(ok ? 0 : 1);
};

const sameDoc = (a, b, ignore) => {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const k of keys) {
        if (k === '_id' || k === '__v' || ignore?.includes(k)) continue;
        if (String(a[k]) !== String(b[k])) return k;
    }
    return null;
};

async function verify(consumers, approved, eligibleByMerchant, plans, diff) {
    const results = [];
    const check = (name, ok, detail = '') => {
        results.push({ name, ok });
        console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ` — ${detail}` : ''}`);
    };

    // (a) Demo consumers exist, are marked, active, and can sign in.
    let signInOk = 0;
    for (const c of consumers) {
        const user = await User.findOne({ email: c.spec.email }).select('+password');
        const marked = !!user && user.role === 'consumer' && user.accountSource === 'demo' && user.isActive;
        let passwordOk = false;
        if (user) {
            try { passwordOk = await user.comparePassword(DEMO_CONSUMER_PASSWORD); } catch { passwordOk = false; }
        }
        if (marked && passwordOk) signInOk += 1;
        check(`demo consumer C${c.spec.slot} sign-in (active, marked, password verifies)`, marked && passwordOk, c.spec.email);
    }

    // (b) Orders reference existing products of the six merchants; consumer
    // order history resolves.
    const merchantIds = new Set(approved.map((m) => String(m._id)));
    const consumerIds = (await User.find({ email: { $regex: /^consumer[1-6]@demo\.com$/ } }).select('_id').lean()).map((u) => String(u._id));
    for (const p of plans) {
        const order = await Order.findOne({ orderNumber: p.orderNumber }).lean();
        const ownerOk = !!order && consumerIds.includes(String(order.user));
        const itemsOk = !!order && order.items.length > 0 && order.items.every((i) => merchantIds.has(String(i.merchant)));
        let productsExist = itemsOk;
        if (itemsOk) {
            const ids = order.items.map((i) => i.product);
            const count = await Product.countDocuments({ _id: { $in: ids } });
            productsExist = count === ids.length;
        }
        const historyOk = !!order && (await Order.countDocuments({ user: order.user })) >= 1;
        check(`${p.orderNumber} references existing six-merchant products + consumer history`, ownerOk && itemsOk && productsExist && historyOk);
    }

    // (c) Each of the six merchants sees demo orders (merchant dashboard query).
    for (const [s, e] of eligibleByMerchant.entries()) {
        const n = await Order.countDocuments({ 'items.merchant': e.merchant._id });
        check(`M${s + 1} merchant dashboard sees orders`, n >= 2, `${n} order(s)`);
    }

    // (d) Date invariants: nothing predates customer, merchant, product, or floor.
    let datesOk = true;
    for (const p of plans) {
        const order = await Order.findOne({ orderNumber: p.orderNumber }).lean();
        if (!order) { datesOk = false; continue; }
        const owner = await User.findById(order.user).select('createdAt').lean();
        const merchantsOfOrder = await Merchant.find({ _id: { $in: order.items.map((i) => i.merchant) } }).select('createdAt').lean();
        const productsOfOrder = await Product.find({ _id: { $in: order.items.map((i) => i.product) } }).select('createdAt').lean();
        const lower = Math.max(
            SEED_FLOOR_DATE.getTime(),
            new Date(owner.createdAt).getTime(),
            ...merchantsOfOrder.map((m) => new Date(m.createdAt).getTime()),
            ...productsOfOrder.map((m) => new Date(m.createdAt).getTime()),
        );
        if (!(new Date(order.createdAt).getTime() > lower)) datesOk = false;
        const tl = order.timeline.map((t) => new Date(t.timestamp).getTime());
        if (tl.some((t, idx) => idx > 0 && t < tl[idx - 1])) datesOk = false;
        if (order.status === 'delivered' && !(order.deliveredAt && new Date(order.deliveredAt) >= new Date(order.createdAt))) datesOk = false;
        if (order.paymentStatus === 'paid' && !(order.paymentDetails?.paidAt)) datesOk = false;
    }
    check('no order predates its customer, merchant, product, or 2026-06-27; timelines monotonic', datesOk);

    // (e) No-change diff for pre-existing records.
    if (diff) {
        const beforeById = new Map();
        for (const coll of ['users', 'merchants', 'products', 'orders']) {
            for (const d of diff.before[coll]) beforeById.set(`${coll}:${d._id}`, d);
        }
        const touchedProducts = new Set(plans.flatMap((p) => p.items.map((i) => `products:${i.product._id}`)));
        const touchedMerchants = new Set(plans.flatMap((p) => p.items.map((i) => `merchants:${i.merchantId}`)));
        let changed = 0;
        let okDiff = true;
        for (const coll of ['users', 'merchants', 'products', 'orders']) {
            for (const d of diff.after[coll]) {
                const key = `${coll}:${d._id}`;
                const prev = beforeById.get(key);
                if (!prev) continue; // newly created demo consumer/order — expected
                beforeById.delete(key);
                const ignore = [];
                if (touchedProducts.has(key)) ignore.push('stock');
                if (touchedMerchants.has(key)) ignore.push('totalOrders', 'totalRevenue');
                const field = sameDoc(prev, d, ignore);
                if (field) {
                    okDiff = false;
                    console.log(`  UNEXPECTED change ${key} field=${field}`);
                } else if (ignore.length > 0) {
                    changed += 1;
                }
            }
        }
        // Anything present in `before` but absent from `after` is a
        // deletion (new demo consumers/orders were never in `before`).
        const afterIds = new Set();
        for (const coll of ['users', 'merchants', 'products', 'orders']) {
            for (const d of diff.after[coll]) afterIds.add(`${coll}:${d._id}`);
        }
        const missing = [...beforeById.keys()].filter((k) => !afterIds.has(k));
        if (missing.length > 0) {
            okDiff = false;
            console.log(`  DELETED records: ${missing.join(', ')}`);
        }
        check('pre-existing records unchanged (only intended stock/counters moved, no timestamp rewrites)', okDiff, `${changed} touched doc(s) with allowed fields`);
    }

    const failed = results.filter((r) => !r.ok);
    console.log(failed.length === 0 ? '\nAll demo consumer seed checks passed.' : `\n${failed.length} check(s) FAILED.`);
    return failed.length === 0;
}

run().catch(async (err) => {
    console.error('Demo consumer seed failed:', err?.message || err);
    try { await mongoose.disconnect(); } catch { /* noop */ }
    process.exit(1);
});
