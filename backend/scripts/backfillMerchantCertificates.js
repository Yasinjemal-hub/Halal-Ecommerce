/**
 * Backfill halal certificates for already-approved merchants.
 *
 * Product rule: business approval IS halal certification. Merchants
 * approved outside the normal workflow (e.g. demo seeds that set
 * verificationStatus directly) may have no certificate record. This script
 * issues exactly one certificate per approved merchant through the same
 * idempotent helper the approval flow uses.
 *
 * Database: uses the application's own configuration (config/env.js +
 * config/db.js → MONGO_ATLAS_URI before MONGO_URI). There is NO local
 * fallback: if the app has no database configured, this script refuses to
 * run instead of silently touching a different database. The connected
 * host/database are printed (never credentials) so the operator can
 * confirm the target.
 *
 * Safety:
 * - never runs on server startup; run it explicitly (see below);
 * - dry-run by default with --dry-run (no writes, lists what would change);
 * - only approved merchants are eligible; pending/rejected/suspended are
 *   counted and skipped, never issued;
 * - already-issued certificates are preserved untouched (no duplicates);
 * - existing merchant applications, dates, and approval history are never
 *   modified — only the missing certificate record is created + linked.
 *
 * Development dry run (same database the app uses via backend/.env):
 *   cd backend && node scripts/backfillMerchantCertificates.js --dry-run
 *
 * Development apply (same database; confirm the printed host/database first):
 *   cd backend && node scripts/backfillMerchantCertificates.js --apply
 *
 * Do NOT point this at production or any external database without
 * explicit confirmation of the printed target.
 */
import '../config/env.js';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Merchant from '../models/Merchant.js';
import { ensureMerchantCertificate } from '../utils/merchantVerification.js';
import { isCertificateIssued } from '../utils/certificationWorkflow.js';

const isDryRun = !process.argv.includes('--apply');

const run = async () => {
    const conn = await connectDB();
    const dbName = conn?.connection?.name || 'unknown';
    const dbHost = conn?.connection?.host || 'unknown';
    console.log(`Target database: host=${dbHost} db=${dbName}`);
    console.log(isDryRun ? 'Mode: DRY RUN (no writes)' : 'Mode: APPLY (will issue missing certificates)');
    console.log('Scanning merchants…');

    const statusCounts = await Merchant.aggregate([
        { $group: { _id: '$verificationStatus', count: { $sum: 1 } } },
    ]);
    const byStatus = Object.fromEntries(statusCounts.map((r) => [r._id, r.count]));

    const approved = await Merchant.find({ verificationStatus: 'approved' }).populate('halalCertification');
    let alreadyValid = 0;
    let issued = 0;
    const wouldIssue = [];

    for (const merchant of approved) {
        const cert = merchant.halalCertification && typeof merchant.halalCertification === 'object'
            ? merchant.halalCertification
            : null;
        if (cert && isCertificateIssued(cert, merchant)) {
            alreadyValid += 1;
            continue;
        }
        if (isDryRun) {
            wouldIssue.push(merchant.businessName);
            continue;
        }
        await ensureMerchantCertificate(merchant, merchant.verifiedBy || undefined);
        issued += 1;
        console.log(`  issued for ${merchant.businessName}`);
    }

    console.log('── Summary ──');
    console.log(`  merchants by status: ${JSON.stringify(byStatus)}`);
    console.log(`  approved merchants: ${approved.length}`);
    console.log(`  already valid (preserved): ${alreadyValid}`);
    if (isDryRun) {
        console.log(`  would issue: ${wouldIssue.length}`);
        wouldIssue.slice(0, 20).forEach((n) => console.log(`    • ${n}`));
        if (wouldIssue.length > 20) console.log(`    … and ${wouldIssue.length - 20} more`);
        console.log('Re-run with --apply to issue the missing certificates.');
    } else {
        console.log(`  newly issued: ${issued}`);
    }
    await mongoose.disconnect();
};

run().catch(async (err) => {
    console.error('Backfill failed:', err?.message || err);
    try { await mongoose.disconnect(); } catch { /* noop */ }
    process.exit(1);
});
