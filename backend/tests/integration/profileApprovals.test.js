import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server.js';
import User from '../../models/User.js';
import { createTestUser, generateAccessToken } from '../helpers.js';
import { connectDB, disconnectDB, clearDB } from '../setup.js';

describe('Profile Update Approvals - Integration Tests', () => {
  beforeAll(connectDB);
  afterAll(disconnectDB);
  afterEach(clearDB);

  let adminUser;
  let adminToken;

  beforeEach(async () => {
    adminUser = await createTestUser({ role: 'admin', email: `admin-${Date.now()}@test.com` });
    adminToken = generateAccessToken(adminUser._id);
  });

  const authGet = (url) => request(app).get(url).set('Authorization', `Bearer ${adminToken}`);
  const authPut = (url, body) => request(app).put(url).set('Authorization', `Bearer ${adminToken}`).send(body);
  const userPut = (token, body) => request(app).put('/api/users/profile').set('Authorization', `Bearer ${token}`).send(body);

  const register = (overrides = {}) => request(app).post('/api/auth/register').send({
    firstName: 'Fresh',
    lastName: 'Signup',
    email: `fresh-${Date.now()}-${Math.floor(Math.random() * 1e6)}@test.com`,
    password: 'Test1234!',
    phone: '+251911000001',
    ...overrides,
  });

  describe('test database isolation (provenance)', () => {
    it('uses an in-memory database, never the persistent browser database', async () => {
      const name = mongoose.connection.name;
      const host = mongoose.connection.host;
      expect(['127.0.0.1', 'localhost']).toContain(host);
      expect(name).not.toBe('halal-ecommerce');
    });
  });

  describe('registration creates no approval request', () => {
    it('a newly registered user has no pending object and is absent from the queue', async () => {
      const email = `newbie-${Date.now()}@test.com`;
      const res = await register({ email });
      expect(res.status).toBe(201);

      const stored = await User.findOne({ email }).lean();
      expect(stored.pendingProfileUpdate?.status ?? null).not.toBe('pending');
      expect(stored.pendingProfileUpdate?.requestedAt ?? null).toBeNull();

      const queue = await authGet('/api/admin/users/pending-updates?limit=100');
      expect(queue.status).toBe(200);
      expect(queue.body.users.map((u) => u.email)).not.toContain(email);
    });
  });

  describe('genuine profile-change requests', () => {
    it('a changed name appears in the queue with date and only the changed field', async () => {
      const user = await createTestUser({ firstName: 'Old', lastName: 'Name' });
      const token = generateAccessToken(user._id);

      const res = await userPut(token, { firstName: 'New' });
      expect(res.status).toBe(200);
      expect(res.body.pendingReview).toBe(true);

      const stored = await User.findById(user._id).lean();
      expect(stored.pendingProfileUpdate.status).toBe('pending');
      expect(stored.pendingProfileUpdate.requestedAt).toBeDefined();
      expect(stored.pendingProfileUpdate.firstName).toBe('New');
      expect(stored.pendingProfileUpdate.lastName).toBeUndefined();
      expect(stored.pendingProfileUpdate.email).toBeUndefined();
      expect(stored.pendingProfileUpdate.phone).toBeUndefined();
      // Current profile is untouched until approval.
      expect(stored.firstName).toBe('Old');

      const queue = await authGet('/api/admin/users/pending-updates?limit=100');
      expect(queue.body.users.map((u) => u.email)).toContain(user.email);
    });

    it('unchanged or case-only submissions create no request', async () => {
      const user = await createTestUser({ firstName: 'Same', email: 'same-case@test.com' });
      const token = generateAccessToken(user._id);

      const res = await userPut(token, {
        firstName: 'Same',
        email: 'SAME-CASE@test.com',
      });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/No profile fields were updated/);

      const stored = await User.findById(user._id).lean();
      expect(stored.pendingProfileUpdate?.status ?? null).not.toBe('pending');

      const queue = await authGet('/api/admin/users/pending-updates?limit=100');
      expect(queue.body.users.map((u) => u.email)).not.toContain('same-case@test.com');
    });

    it('immediate-only changes succeed without creating a request', async () => {
      const user = await createTestUser({});
      const token = generateAccessToken(user._id);

      const res = await userPut(token, { preferredLanguage: 'am' });
      expect(res.status).toBe(200);
      expect(res.body.pendingReview).toBe(false);

      const stored = await User.findById(user._id).lean();
      expect(stored.preferredLanguage).toBe('am');
      expect(stored.pendingProfileUpdate?.status ?? null).not.toBe('pending');
    });

    it('rejects a staged email that is already taken', async () => {
      await createTestUser({ email: 'taken@test.com' });
      const user = await createTestUser({ email: 'requester@test.com' });
      const token = generateAccessToken(user._id);

      const res = await userPut(token, { email: 'taken@test.com' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already in use/);
    });
  });

  describe('approval queue (genuine records, paginated)', () => {
    it('paginates and excludes empty auto-defaulted legacy records', async () => {
      // Legacy shape: status-only default with no date and no fields,
      // inserted raw to bypass Mongoose defaults (as stored pre-fix).
      await User.collection.insertOne({
        firstName: 'Legacy',
        lastName: 'Default',
        email: 'legacy-default@test.com',
        password: 'hashed-not-real',
        role: 'consumer',
        pendingProfileUpdate: { status: 'pending' },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const genuine = await createTestUser({ firstName: 'Genuine', email: 'genuine-q@test.com' });
      await userPut(generateAccessToken(genuine._id), { firstName: 'Genuine Changed' });

      const page = await authGet('/api/admin/users/pending-updates?limit=1&page=1');
      expect(page.status).toBe(200);
      expect(page.body.total).toBe(1);
      expect(page.body.totalPages).toBe(1);
      expect(page.body.users).toHaveLength(1);
      expect(page.body.users[0].email).toBe('genuine-q@test.com');

      // Stats pending count stays genuine-only too.
      const list = await authGet('/api/admin/users?role=consumer&limit=100');
      expect(list.body.stats.pendingUpdates).toBe(1);
    });

    it('validates queue pagination parameters', async () => {
      expect((await authGet('/api/admin/users/pending-updates?page=0')).status).toBe(400);
      expect((await authGet('/api/admin/users/pending-updates?limit=101')).status).toBe(400);
    });

    it('requires admin authorization', async () => {
      const consumer = await createTestUser({});
      const res = await request(app)
        .get('/api/admin/users/pending-updates')
        .set('Authorization', `Bearer ${generateAccessToken(consumer._id)}`);
      expect(res.status).toBe(403);
    });
  });

  describe('safe and auditable decisions', () => {
    const requestNameChange = async (email, firstName) => {
      const user = await createTestUser({ email, firstName: 'Before' });
      const res = await userPut(generateAccessToken(user._id), { firstName });
      expect(res.status).toBe(200);
      return User.findById(user._id);
    };

    it('approval applies reviewed fields and preserves decision metadata', async () => {
      const user = await requestNameChange('approve-me@test.com', 'After');
      const requestedAt = user.pendingProfileUpdate.requestedAt.toISOString();

      const res = await authPut(`/api/admin/users/${user._id}/profile-approval`, {
        action: 'approved',
        reviewNotes: 'Looks good',
        expectedRequestedAt: requestedAt,
      });
      expect(res.status).toBe(200);

      const stored = await User.findById(user._id).lean();
      expect(stored.firstName).toBe('After');
      expect(stored.pendingProfileUpdate.status).toBe('approved');
      expect(stored.pendingProfileUpdate.reviewedAt).toBeDefined();
      expect(String(stored.pendingProfileUpdate.reviewedBy)).toBe(String(adminUser._id));
      expect(stored.pendingProfileUpdate.reviewNotes).toBe('Looks good');
      // Requested value preserved in history.
      expect(stored.pendingProfileUpdate.firstName).toBe('After');
    });

    it('a second decision on the same request cannot apply twice', async () => {
      const user = await requestNameChange('once-only@test.com', 'After');
      const url = `/api/admin/users/${user._id}/profile-approval`;

      expect((await authPut(url, { action: 'approved' })).status).toBe(200);
      const again = await authPut(url, { action: 'approved' });
      expect(again.status).toBe(400);
      expect(again.body.message).toMatch(/no pending profile update/i);
    });

    it('a stale expectedRequestedAt is rejected with 409 and changes nothing', async () => {
      const user = await requestNameChange('stale-req@test.com', 'After');

      const res = await authPut(`/api/admin/users/${user._id}/profile-approval`, {
        action: 'approved',
        expectedRequestedAt: new Date('2020-01-01T00:00:00.000Z').toISOString(),
      });
      expect(res.status).toBe(409);

      const stored = await User.findById(user._id).lean();
      expect(stored.firstName).toBe('Before');
      expect(stored.pendingProfileUpdate.status).toBe('pending');
    });

    it('a resubmission after the load also conflicts instead of overwriting', async () => {
      const user = await requestNameChange('resubmit@test.com', 'First');
      const staleAt = user.pendingProfileUpdate.requestedAt.toISOString();

      // User submits a newer request before the admin decides.
      await userPut(generateAccessToken(user._id), { firstName: 'Second' });

      const res = await authPut(`/api/admin/users/${user._id}/profile-approval`, {
        action: 'approved',
        expectedRequestedAt: staleAt,
      });
      expect(res.status).toBe(409);

      const stored = await User.findById(user._id).lean();
      expect(stored.pendingProfileUpdate.firstName).toBe('Second');
      expect(stored.pendingProfileUpdate.status).toBe('pending');
    });

    it('rejection leaves the profile unchanged and preserves notes for resubmission', async () => {
      const user = await requestNameChange('reject-me@test.com', 'Denied');

      const res = await authPut(`/api/admin/users/${user._id}/profile-approval`, {
        action: 'rejected',
        reviewNotes: 'Please use your legal name',
      });
      expect(res.status).toBe(200);

      const stored = await User.findById(user._id).lean();
      expect(stored.firstName).toBe('Before');
      expect(stored.pendingProfileUpdate.status).toBe('rejected');
      expect(stored.pendingProfileUpdate.reviewNotes).toBe('Please use your legal name');
      expect(stored.pendingProfileUpdate.reviewedAt).toBeDefined();

      // A corrected request after rejection becomes pending again.
      const retry = await userPut(generateAccessToken(user._id), { firstName: 'Legal' });
      expect(retry.status).toBe(200);
      expect(retry.body.pendingReview).toBe(true);
      const queue = await authGet('/api/admin/users/pending-updates?limit=100');
      expect(queue.body.users.map((u) => u.email)).toContain('reject-me@test.com');
    });

    it('an email taken after the request fails approval with a clear conflict', async () => {
      const requester = await createTestUser({ email: 'requester-c@test.com' });
      await userPut(generateAccessToken(requester._id), { firstName: 'Newname' });
      // Another account takes the requested email after the request. Use a
      // name-change request plus a colliding email staged directly to
      // simulate the race deterministically.
      await User.findByIdAndUpdate(requester._id, {
        pendingProfileUpdate: {
          firstName: 'Newname',
          email: 'contested@test.com',
          requestedAt: new Date(),
          status: 'pending',
        },
      });
      await createTestUser({ email: 'contested@test.com' });

      const res = await authPut(`/api/admin/users/${requester._id}/profile-approval`, { action: 'approved' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/already in use/);

      const stored = await User.findById(requester._id).lean();
      expect(stored.firstName).toBe('Test');
      expect(stored.pendingProfileUpdate.status).toBe('pending');
    });

    it('malformed requested values stay visible but cannot be decided', async () => {
      const user = await createTestUser({ email: 'malformed@test.com' });
      await User.findByIdAndUpdate(user._id, {
        pendingProfileUpdate: {
          phone: 'not-a-phone',
          requestedAt: new Date(),
          status: 'pending',
        },
      });

      // The record is shown (date + field present) so it is never silently
      // dropped, but the decision is refused with a clear message.
      const queue = await authGet('/api/admin/users/pending-updates?limit=100');
      expect(queue.body.users.map((u) => u.email)).toContain('malformed@test.com');

      const res = await authPut(`/api/admin/users/${user._id}/profile-approval`, { action: 'approved' });
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid/i);

      const stored = await User.findById(user._id).lean();
      expect(stored.phone).toBe('+251912345678');
      expect(stored.pendingProfileUpdate.status).toBe('pending');
    });

    it('validates action, id, and authorization on the decision endpoint', async () => {
      const user = await requestNameChange('guarded@test.com', 'After');
      const url = `/api/admin/users/${user._id}/profile-approval`;

      expect((await authPut(url, { action: 'maybe' })).status).toBe(400);
      expect((await authGet('/api/admin/users/not-an-id/profile-approval')).status).toBe(404);

      const consumer = await createTestUser({});
      const forbidden = await request(app)
        .put(url)
        .set('Authorization', `Bearer ${generateAccessToken(consumer._id)}`)
        .send({ action: 'approved' });
      expect(forbidden.status).toBe(403);
    });
  });
});
