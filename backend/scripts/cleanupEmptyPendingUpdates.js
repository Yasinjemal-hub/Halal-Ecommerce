/**
 * Cleanup: remove empty auto-defaulted `pendingProfileUpdate` objects.
 *
 * Background: the User schema used to default an empty pendingProfileUpdate
 * to `status: 'pending'`, so users who never requested a change can carry a
 * status-only object that looks like a review request. The schema default
 * has been removed, but existing documents keep their stored value.
 *
 * Scope is strictly limited to records where ALL of the following hold:
 *   - pendingProfileUpdate.status === 'pending', AND
 *   - no requestedAt timestamp, AND
 *   - none of firstName / lastName / email / phone holds a real value.
 * Genuine requests (status + date + ≥1 field) and all decided history
 * (approved / rejected) are never touched. Matching is by stored field
 * values only — never by email patterns or names.
 *
 * - Default (no flags): DRY RUN — lists every targeted user and the
 *   proposed change. No writes.
 * - `--apply`: removes only the empty pendingProfileUpdate object
 *   (`$unset`), preserving the user and all other data and timestamps.
 * - Refuses to run when NODE_ENV=production. Do NOT run against a live or
 *   production database; this is for development databases only.
 *
 * Development dry run (same database the app uses via backend/.env):
 *   cd backend && node scripts/cleanupEmptyPendingUpdates.js
 *
 * Development apply (confirm the printed host/database first):
 *   cd backend && node scripts/cleanupEmptyPendingUpdates.js --apply
 */
import '../config/env.js';
import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import User from '../models/User.js';
import { getRequestedFields } from '../utils/profileUpdates.js';

const run = async () => {
    if (process.env.NODE_ENV === 'production') {
        console.error('Refusing to run the pending-update cleanup with NODE_ENV=production.');
        process.exit(1);
    }
    const apply = process.argv.includes('--apply');

    const conn = await connectDB();
    const dbName = conn?.connection?.name || 'unknown';
    const dbHost = conn?.connection?.host || 'unknown';
    console.log(`Target database: host=${dbHost} db=${dbName}`);
    console.log(apply ? 'Mode: APPLY (removing empty pending objects)' : 'Mode: DRY RUN (no writes)');

    // Candidates: status-only pending objects. Every candidate is rechecked
    // in JS with the shared genuineness predicate before any write, so a
    // genuine request can never be swept up by a query edge case.
    const candidates = await User.find({
        'pendingProfileUpdate.status': 'pending',
        $or: [
            { 'pendingProfileUpdate.requestedAt': { $exists: false } },
            { 'pendingProfileUpdate.requestedAt': null },
        ],
    })
        .select('_id email role pendingProfileUpdate createdAt')
        .lean();

    const targets = [];
    const skippedGenuine = [];
    for (const user of candidates) {
        const pending = user.pendingProfileUpdate || {};
        if (!pending.requestedAt && getRequestedFields(pending).length === 0) {
            targets.push(user);
        } else {
            skippedGenuine.push(user);
        }
    }

    const decided = await User.countDocuments({
        'pendingProfileUpdate.status': { $in: ['approved', 'rejected'] },
    });

    console.log(`\nStatus-only pending objects found: ${targets.length}`);
    console.log(`Genuine requests skipped (untouched): ${skippedGenuine.length}`);
    console.log(`Decided history records (untouched): ${decided}`);
    for (const user of targets.slice(0, 50)) {
        console.log(`  - ${user.email} (role=${user.role}, joined=${user.createdAt?.toISOString()})`);
    }
    if (targets.length > 50) {
        console.log(`  ... and ${targets.length - 50} more`);
    }

    if (!apply) {
        console.log('\nDry run complete — no changes written. Re-run with --apply to remove the listed empty objects.');
        await mongoose.disconnect();
        return;
    }

    let cleared = 0;
    for (const user of targets) {
        // Re-verify immediately before the write; abort the record on any
        // doubt. $unset removes only the empty object — the user, profile
        // data, and timestamps are preserved.
        const fresh = await User.findById(user._id).select('pendingProfileUpdate').lean();
        const pending = fresh?.pendingProfileUpdate || {};
        if (pending.status === 'pending' && !pending.requestedAt && getRequestedFields(pending).length === 0) {
            await User.updateOne({ _id: user._id }, { $unset: { pendingProfileUpdate: 1 } });
            cleared += 1;
        } else {
            console.log(`  skipped ${user.email}: changed since planning — left untouched`);
        }
    }

    console.log(`\nCleared ${cleared} of ${targets.length} empty pending objects.`);
    await mongoose.disconnect();
};

run().catch(async (err) => {
    console.error('Pending-update cleanup failed:', err?.message || err);
    try { await mongoose.disconnect(); } catch { /* noop */ }
    process.exit(1);
});
