import request from 'supertest';
import app from '../../server.js';
import User from '../../models/User.js';
import { createTestUser } from '../helpers.js';
import { connectDB, disconnectDB, clearDB } from '../setup.js';

describe('Auth API - Integration Tests', () => {
  beforeAll(connectDB);
  afterAll(disconnectDB);
  afterEach(clearDB);
  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'New',
          lastName: 'User',
          email: 'newuser@example.com',
          password: 'Test1234!',
          phone: '+251912345678',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe('newuser@example.com');
      expect(res.body.user.password).toBeUndefined();
    });

    it('should return 400 when email already exists', async () => {
      await createTestUser({ email: 'duplicate@example.com' });

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          firstName: 'Dup',
          lastName: 'User',
          email: 'duplicate@example.com',
          password: 'Test1234!',
          phone: '+251912345678',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'short' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await createTestUser({
        email: 'logintest@example.com',
        password: 'Test1234!',
      });
    });

    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'Test1234!',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toBeDefined();
      expect(res.headers['set-cookie']).toBeDefined();
    });

    it('should return 401 with invalid password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'logintest@example.com',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should return 400 when email is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ password: 'Test1234!' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout successfully', async () => {
      const user = await createTestUser();
      const { generateAccessToken } = await import('../../utils/generateToken.js');
      const token = generateAccessToken(user._id);

      const res = await request(app)
        .post('/api/auth/logout')
        .set('Cookie', `accessToken=${token}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/auth/refresh-token', () => {
    it('should return 401 when no refresh token is provided', async () => {
      const res = await request(app).post('/api/auth/refresh-token');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/auth/verify-email/:token', () => {
    it('should return 400 with invalid token', async () => {
      const res = await request(app)
        .get('/api/auth/verify-email/invalid-token');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });
  });
});
