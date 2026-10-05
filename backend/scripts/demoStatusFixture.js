/**
 * Demo status fixture: give the 30 seeded demo merchants a realistic mix
 * of review statuses (6 × pending, under_review, approved, rejected,
 * suspended) WITHOUT resetting or regenerating anything.
 *
 * Scope is strictly limited to the known demo identities
 * (merchant1@demo.com … merchant30@demo.com). Real merchant accounts are
 * never touched. Nothing is deleted or recreated: merchant identities,
 * business details, createdAt/registration dates, products, orders, and
 * their timestamps are preserved — only status-related fields change,
 * applied through the project's real approval workflow
 * (decideMerchantVerification) so review history and certificate
 * issue/invalidate behavior stay consistent.
 *
 * - Default (no flags): DRY RUN — lists every targeted merchant, its
 *   current status, and the proposed status. No writes.
 * - `--apply`: writes the changes after printing the same plan.
 * - Refuses to run when NODE_ENV=production. Do NOT run against a live or
 *   production database; this is for development databases only.
 *
 * Development dry run (same database the app uses via backend/.env):
 *   cd backend && node scripts/demoStatusFixture.js
 *
 * Development apply (confirm the printed host/database first):
 *   cd backend && node scripts/demoStatusFixture.js --apply
 */
import '../config/env.js';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import Merchant from '../models/Merchant.js';
import Certification from '../models/Certification.js';
import { decideMerchantVerification } from '../utils/merchantVerification.js';
import { isCertificateIssued } from '../utils/certificationWorkflow.js';

const STATUSES = ['pending', 'under_review', 'approved', 'rejected', 'suspended'];

const DEMO_EMAIL = (i) => `merchant${i}@demo.com`;

const run = async () => {
    if (process.env.NODE_ENV === 'production') {
        console.error('Refusing to run the demo status fixture with NODE_ENV=production.');
        process.exit(1);
    }
    const apply = process.argv.includes('--apply');

    const conn = await connectDB();
    const dbName = conn?.connection?.name || 'unknown';
    const dbHost = conn?.connection?.host || 'unknown';
    console.log(`Target database: host=${dbHost} db=${dbName}`);
    console.log(apply ? 'Mode: APPLY (writing status changes)' : 'Mode: DRY RUN (no writes)');
    console.log('Scope: merchant1@demo.com … merchant30@demo.com only');

    // Resolve the 30 known demo identities in numeric order.
    const targets = [];
    const missing = [];
    for (let i = 1; i <= 30; i += 1) {
        const user = await User.findOne({ email: DEMO_EMAIL(i) }).lean();
        if (!user) {
            missing.push(DEMO_EMAIL(i));
            continue;
        }
        const merchant = await Merchant.findOne({ user: user._id }).populate('halalCertification');
        if (!merchant) {
            missing.push(`${DEMO_EMAIL(i)} (no merchant profile)`);
            continue;
        }
        targets.push({ index: i - 1, email: DEMO_EMAIL(i), merchant });
    }

    if (missing.length > 0) {
        console.log(`\nNote: ${missing.length} demo identity(s) not found, excluded from the fixture:`);
        missing.forEach((m) => console.log(`  - ${m}`));
    }
    if (targets.length === 0) {
        console.log('No demo merchants found. Nothing to do.');
        await mongoose.disconnect();
        return;
    }

    // Balanced distribution across the merchants actually present:
    // sequential blocks of 6 (pending, under_review, approved, rejected,
    // suspended). With all 30 present this is exactly 6 per status.
    const plan = targets.map((t, position) => ({
        ...t,
        proposed: STATUSES[Math.min(Math.floor(position / 6), STATUSES.length - 1)],
    }));

    console.log('\nProposed assignment:');
    console.log('email                     business                        current       → proposed');
    for (const p of plan) {
        const cert = p.merchant.halalCertification && typeof p.merchant.halalCertification === 'object'
            ? p.merchant.halalCertification
            : null;
        const certFlag = cert && isCertificateIssued(cert, p.merchant) ? ' [cert VALID]' : cert ? ` [cert ${cert.status}]` : ' [no cert]';
        console.log(
            `${p.email.padEnd(26)}${String(p.merchant.businessName).slice(0, 30).padEnd(31)}` +
            `${String(p.merchant.verificationStatus).padEnd(14)}→ ${p.proposed}${certFlag}`
        );
    }

    const counts = {};
    plan.forEach((p) => { counts[p.proposed] = (counts[p.proposed] || 0) + 1; });
    console.log(`\nDistribution: ${JSON.stringify(counts)} (target: 6 per status over 30 demo merchants)`);

    if (!apply) {
        console.log('\nDry run complete — no changes written. Re-run with --apply to write them.');
        await mongoose.disconnect();
        return;
    }

    // Reviewer of record for the fixture decisions.
    const reviewer = await User.findOne({ email: 'admin@halalecommerce.com' }).lean();
    const reviewerId = reviewer?._id;
    if (!reviewerId) console.log('Note: superadmin not found; fixture decisions will record no reviewer.');

    let changed = 0;
    let certsIssued = 0;
    let certsInvalidated = 0;
    for (const p of plan) {
        const before = {
            createdAt: p.merchant.createdAt.toISOString(),
            status: p.merchant.verificationStatus,
            certId: p.merchant.halalCertification?._id?.toString() || p.merchant.halalCertification?.toString() || null,
        };
        if (p.merchant.verificationStatus === p.proposed) {
            // Already at target: only repair certificate consistency.
            const cert = p.merchant.halalCertification && typeof p.merchant.halalCertification === 'object'
                ? p.merchant.halalCertification
                : null;
            if (p.proposed === 'approved' && !(cert && isCertificateIssued(cert, p.merchant))) {
                const { ensureMerchantCertificate } = await import('../utils/merchantVerification.js');
                await ensureMerchantCertificate(p.merchant, reviewerId);
                certsIssued += 1;
                console.log(`  repaired certificate for ${p.email} (already ${p.proposed})`);
            } else if ((p.proposed === 'rejected' || p.proposed === 'suspended') && cert && isCertificateIssued(cert, p.merchant)) {
                const { invalidateMerchantCertificate } = await import('../utils/merchantVerification.js');
                const fresh = await Merchant.findById(p.merchant._id);
                await invalidateMerchantCertificate(fresh);
                certsInvalidated += 1;
                console.log(`  invalidated stale certificate for ${p.email} (already ${p.proposed})`);
            } else {
                console.log(`  ${p.email}: already ${p.proposed}, consistent — untouched`);
            }
            continue;
        }

        const decision = { verificationStatus: p.proposed, reviewerId, notify: false };
        if (p.proposed === 'rejected') {
            decision.rejectionReason = 'Demo fixture: business details need corrections before approval.';
            decision.verificationNotes = 'Status assigned by the demo status fixture for review-state coverage.';
        } else {
            decision.verificationNotes = 'Status assigned by the demo status fixture for review-state coverage.';
        }
        const updated = await decideMerchantVerification(p.merchant._id, decision);
        changed += 1;

        // createdAt/registration date must survive the transition.
        if (updated.createdAt.toISOString() !== before.createdAt) {
            throw new Error(`createdAt changed for ${p.email} — aborting to protect historical data.`);
        }
        const freshCert = updated.halalCertification
            ? await Certification.findById(updated.halalCertification)
            : null;
        if (p.proposed === 'approved' && freshCert && isCertificateIssued(freshCert, updated)) certsIssued += 1;
        if ((p.proposed === 'rejected' || p.proposed === 'suspended') && freshCert && !isCertificateIssued(freshCert, updated)) {
            certsInvalidated += 1;
        }
        console.log(`  ${p.email}: ${before.status} → ${p.proposed}`);
    }

    console.log('\n── Fixture summary ──');
    console.log(`  merchants updated: ${changed} of ${plan.length}`);
    console.log(`  certificates issued: ${certsIssued}`);
    console.log(`  certificates invalidated: ${certsInvalidated}`);
    const finalCounts = await Merchant.aggregate([
        { $match: { _id: { $in: plan.map((p) => p.merchant._id) } } },
        { $group: { _id: '$verificationStatus', count: { $sum: 1 } } },
    ]);
    console.log(`  final demo status counts: ${JSON.stringify(Object.fromEntries(finalCounts.map((r) => [r._id, r.count])))}`);
    await mongoose.disconnect();
};

run().catch(async (err) => {
    console.error('Demo status fixture failed:', err?.message || err);
    try { await mongoose.disconnect(); } catch { /* noop */ }
    process.exit(1);
});
