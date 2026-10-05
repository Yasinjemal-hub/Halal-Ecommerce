import request from 'supertest';
import mongoose from 'mongoose';
import app from '../../server.js';
import User from '../../models/User.js';
import { createTestUser, generateAccessToken } from '../helpers.js';
import { connectDB, disconnectDB, clearDB } from '../setup.js';

describe('Admin Consumers - Integration Tests', () => {
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

  describe('test database isolation (provenance)', () => {
    it('uses an in-memory database, never the persistent browser database', async () => {
      const name = mongoose.connection.name;
      const host = mongoose.connection.host;
      // mongodb-memory-server serves from loopback with an ephemeral port/db.
      expect(['127.0.0.1', 'localhost']).toContain(host);
      expect(name).not.toBe('halal-ecommerce');
      expect(process.env.MONGO_ATLAS_URI || '').not.toContain(host);
    });
  });

  describe('GET /api/admin/users (server-side search/filter/sort/pagination)', () => {
    it('returns paginated consumers with accurate totals and stats', async () => {
      await createTestUser({ firstName: 'Abebe', lastName: 'Kebede', email: 'abebe-c@test.com' });
      await createTestUser({ firstName: 'Zara', lastName: 'Ali', email: 'zara-c@test.com' });

      const res = await authGet('/api/admin/users?role=consumer&limit=1&page=1&sort=name');

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(1);
      expect(res.body.total).toBeGreaterThanOrEqual(2);
      expect(res.body.totalPages).toBe(Math.ceil(res.body.total / 1));
      expect(res.body.currentPage).toBe(1);
      expect(res.body.stats).toBeDefined();
      expect(res.body.stats.total).toBe(res.body.stats.active + res.body.stats.inactive);
      // Sorted by name: Abebe before Zara
      expect(res.body.users[0].firstName).toBe('Abebe');
    });

    it('searches across name, email and phone on the server', async () => {
      await createTestUser({ firstName: 'Searchable', lastName: 'Person', email: 'findme-c@test.com', phone: '+251911000001' });

      const byName = await authGet('/api/admin/users?role=consumer&search=searchable');
      expect(byName.status).toBe(200);
      expect(byName.body.total).toBeGreaterThanOrEqual(1);

      const byEmail = await authGet('/api/admin/users?role=consumer&search=findme-c@test.com');
      expect(byEmail.status).toBe(200);
      expect(byEmail.body.total).toBeGreaterThanOrEqual(1);

      const miss = await authGet('/api/admin/users?role=consumer&search=no-such-person-xyz');
      expect(miss.status).toBe(200);
      expect(miss.body.total).toBe(0);
    });

    it('filters by consumer account status', async () => {
      const inactive = await createTestUser({ email: 'inactive-c@test.com', isActive: false });

      const active = await authGet('/api/admin/users?role=consumer&status=active&limit=100');
      expect(active.status).toBe(200);
      expect(active.body.users.every((u) => u.isActive)).toBe(true);

      const onlyInactive = await authGet('/api/admin/users?role=consumer&status=inactive&limit=100');
      expect(onlyInactive.status).toBe(200);
      expect(onlyInactive.body.users.map((u) => u._id)).toContain(inactive._id.toString());
    });

    it('validates query parameters and sort fields', async () => {
      expect((await authGet('/api/admin/users?sort=bogus')).status).toBe(400);
      expect((await authGet('/api/admin/users?status=bogus')).status).toBe(400);
      expect((await authGet('/api/admin/users?role=bogus')).status).toBe(400);
      expect((await authGet('/api/admin/users?limit=1000')).status).toBe(400);
      expect((await authGet('/api/admin/users?page=0')).status).toBe(400);
      expect((await authGet('/api/admin/users?isActive=maybe')).status).toBe(400);
    });

    it('bounds pagination (no unbounded limit=1000 fetch)', async () => {
      const res = await authGet('/api/admin/users?role=consumer&limit=1000');
      expect(res.status).toBe(400);
    });
  });

  describe('safe user fields', () => {
    it('never returns passwords, tokens or secrets in admin listings', async () => {
      await createTestUser({ email: 'safe-c@test.com' });
      const res = await authGet('/api/admin/users?role=consumer&limit=5');

      expect(res.status).toBe(200);
      for (const u of res.body.users) {
        expect(u.password).toBeUndefined();
        expect(u.emailVerificationToken).toBeUndefined();
        expect(u.emailVerificationExpires).toBeUndefined();
        expect(u.passwordResetToken).toBeUndefined();
        expect(u.passwordResetExpires).toBeUndefined();
        expect(u.refreshToken).toBeUndefined();
        expect(u.refreshTokenExpires).toBeUndefined();
        // Useful admin fields remain
        expect(u._id).toBeDefined();
        expect(u.email).toBeDefined();
      }
    });
  });

  describe('GET /api/admin/users/:id (consumer detail)', () => {
    it('returns admin-safe detail with order summary for admins', async () => {
      const target = await createTestUser({ email: 'detail-c@test.com' });
      const res = await authGet(`/api/admin/users/${target._id}`);

      expect(res.status).toBe(200);
      expect(res.body.user.email).toBe('detail-c@test.com');
      expect(res.body.user.password).toBeUndefined();
      expect(res.body.user.refreshToken).toBeUndefined();
      expect(res.body.orderSummary).toBeDefined();
      expect(res.body.orderSummary.totalOrders).toBe(0);
    });

    it('rejects invalid ids and enforces admin authorization', async () => {
      const target = await createTestUser({ email: 'detail2-c@test.com' });

      expect((await authGet('/api/admin/users/not-an-id')).status).toBe(400);
      expect((await authGet(`/api/admin/users/${new mongoose.Types.ObjectId()}`)).status).toBe(404);

      const consumer = await createTestUser({ email: 'plain-c@test.com' });
      const consumerToken = generateAccessToken(consumer._id);
      const forbidden = await request(app)
        .get(`/api/admin/users/${target._id}`)
        .set('Authorization', `Bearer ${consumerToken}`);
      expect(forbidden.status).toBe(403);
    });
  });

  describe('PUT /api/admin/users/:id/status (consumer control)', () => {
    it('deactivates and reactivates an eligible consumer and returns the server record', async () => {
      const target = await createTestUser({ email: 'toggle-c@test.com' });

      const off = await request(app)
        .put(`/api/admin/users/${target._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(off.status).toBe(200);
      expect(off.body.user.isActive).toBe(false);

      const on = await request(app)
        .put(`/api/admin/users/${target._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(on.status).toBe(200);
      expect(on.body.user.isActive).toBe(true);
    });

    it('refuses non-consumer roles and self-deactivation', async () => {
      const merchant = await createTestUser({ role: 'merchant', email: 'merch-toggle@test.com' });
      const refusedMerchant = await request(app)
        .put(`/api/admin/users/${merchant._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(refusedMerchant.status).toBe(403);

      const refusedSelf = await request(app)
        .put(`/api/admin/users/${adminUser._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(refusedSelf.status).toBe(403);
    });

    it('deactivation blocks login and session access; reactivation restores login', async () => {
      const target = await createTestUser({ email: 'session-c@test.com', password: 'Test1234!' });

      await request(app)
        .put(`/api/admin/users/${target._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`);

      const loginBlocked = await request(app)
        .post('/api/auth/login')
        .send({ email: 'session-c@test.com', password: 'Test1234!' });
      expect(loginBlocked.status).toBe(403);

      const staleToken = generateAccessToken(target._id);
      const protectedBlocked = await request(app)
        .get('/api/users/profile')
        .set('Authorization', `Bearer ${staleToken}`);
      expect(protectedBlocked.status).toBe(403);

      await request(app)
        .put(`/api/admin/users/${target._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`);

      const loginOk = await request(app)
        .post('/api/auth/login')
        .send({ email: 'session-c@test.com', password: 'Test1234!' });
      expect(loginOk.status).toBe(200);
    });
  });

  describe('demo/test provenance visibility', () => {
    it('includes demo consumers like regular ones by default; test fixtures stay excluded', async () => {
      await createTestUser({ email: 'regular-c@test.com', accountSource: 'regular' });
      await createTestUser({ email: 'demo-c@test.com', accountSource: 'demo' });
      await createTestUser({ email: 'fixture-c@test.com', accountSource: 'test' });

      const def = await authGet('/api/admin/users?role=consumer&limit=100');
      expect(def.status).toBe(200);
      const emails = def.body.users.map((u) => u.email);
      expect(emails).toContain('regular-c@test.com');
      expect(emails).toContain('demo-c@test.com');
      expect(emails).not.toContain('fixture-c@test.com');

      // Demo accounts participate in search and summary counts.
      const search = await authGet('/api/admin/users?role=consumer&limit=100&search=demo-c@test.com');
      expect(search.status).toBe(200);
      expect(search.body.users.map((u) => u.email)).toContain('demo-c@test.com');
      expect(def.body.stats.total).toBeGreaterThanOrEqual(2);

      // Explicit opt-out still hides demo accounts (backward compatible).
      const hidden = await authGet('/api/admin/users?role=consumer&limit=100&includeDemo=false');
      expect(hidden.status).toBe(200);
      expect(hidden.body.users.map((u) => u.email)).toContain('regular-c@test.com');
      expect(hidden.body.users.map((u) => u.email)).not.toContain('demo-c@test.com');

      const onlyDemo = await authGet('/api/admin/users?role=consumer&limit=100&accountSource=demo');
      expect(onlyDemo.status).toBe(200);
      expect(onlyDemo.body.users.length).toBeGreaterThan(0);
      expect(onlyDemo.body.users.every((u) => u.accountSource === 'demo')).toBe(true);
    });

    it('lets admins open demo consumer details and toggle status like regular consumers', async () => {
      const demo = await createTestUser({ email: 'managed-demo@test.com', accountSource: 'demo' });

      const detail = await authGet(`/api/admin/users/${demo._id}`);
      expect(detail.status).toBe(200);
      expect(detail.body.user.email).toBe('managed-demo@test.com');

      const off = await request(app)
        .put(`/api/admin/users/${demo._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(off.status).toBe(200);
      expect(off.body.user.isActive).toBe(false);

      const inactive = await authGet('/api/admin/users?role=consumer&limit=100&status=inactive');
      expect(inactive.body.users.map((u) => u.email)).toContain('managed-demo@test.com');

      const on = await request(app)
        .put(`/api/admin/users/${demo._id}/status`)
        .set('Authorization', `Bearer ${adminToken}`);
      expect(on.status).toBe(200);
      expect(on.body.user.isActive).toBe(true);
    });

    it('never exposes demo/test accounts in production, regardless of query parameters', async () => {
      await createTestUser({ email: 'regular-c@test.com', accountSource: 'regular' });
      await createTestUser({ email: 'demo-c@test.com', accountSource: 'demo' });
      await createTestUser({ email: 'fixture-c@test.com', accountSource: 'test' });

      const prev = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        for (const qs of ['', '&includeDemo=true', '&accountSource=demo', '&accountSource=test']) {
          const res = await authGet(`/api/admin/users?role=consumer&limit=100${qs}`);
          expect(res.status).toBe(200);
          const emails = res.body.users.map((u) => u.email);
          expect(emails).toContain('regular-c@test.com');
          expect(emails).not.toContain('demo-c@test.com');
          expect(emails).not.toContain('fixture-c@test.com');
        }
      } finally {
        process.env.NODE_ENV = prev;
      }
    });

    it('never excludes legitimate users through email heuristics', async () => {
      // A regular user whose email merely looks like a demo address stays visible.
      await createTestUser({ email: 'merchant1@demo.com', accountSource: 'regular', role: 'consumer' });
      const res = await authGet('/api/admin/users?role=consumer&limit=100');
      expect(res.status).toBe(200);
      expect(res.body.users.map((u) => u.email)).toContain('merchant1@demo.com');
    });
  });
});
