import { protect } from '../../../middleware/auth.js';
import { createTestUser } from '../../helpers.js';
import { connectDB, disconnectDB, clearDB } from '../../setup.js';

const mockResponse = () => {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  return res;
};

describe('Auth Middleware - protect', () => {
  beforeAll(connectDB);
  afterAll(disconnectDB);
  afterEach(clearDB);

  let testUser;
  const next = () => {};

  beforeEach(async () => {
    testUser = await createTestUser();
  });

  it('should return 401 when no token is provided', async () => {
    const req = { headers: {}, cookies: {} };
    const res = mockResponse();
    await protect(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Not authorized — no token provided');
  });

  it('should return 401 when an invalid token is provided', async () => {
    const req = {
      headers: { authorization: 'Bearer invalid-token-value' },
      cookies: {},
    };
    const res = mockResponse();
    await protect(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should attach user to request when valid token is in Authorization header', async () => {
    const { generateAccessToken } = await import('../../../utils/generateToken.js');
    const token = generateAccessToken(testUser._id);
    const req = {
      headers: { authorization: `Bearer ${token}` },
      cookies: {},
    };
    const res = mockResponse();
    let calledNext = false;
    const customNext = () => { calledNext = true; };

    await protect(req, res, customNext);
    expect(calledNext).toBe(true);
    expect(req.user).toBeDefined();
    expect(req.user._id.toString()).toBe(testUser._id.toString());
  });

  it('should attach user when token is in httpOnly cookie', async () => {
    const { generateAccessToken } = await import('../../../utils/generateToken.js');
    const token = generateAccessToken(testUser._id);
    const req = {
      headers: {},
      cookies: { accessToken: token },
    };
    const res = mockResponse();
    let calledNext = false;
    const customNext = () => { calledNext = true; };

    await protect(req, res, customNext);
    expect(calledNext).toBe(true);
    expect(req.user).toBeDefined();
  });

  it('should return 403 if user account is deactivated', async () => {
    testUser.isActive = false;
    await testUser.save();

    const { generateAccessToken } = await import('../../../utils/generateToken.js');
    const token = generateAccessToken(testUser._id);
    const req = {
      headers: { authorization: `Bearer ${token}` },
      cookies: {},
    };
    const res = mockResponse();
    await protect(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toContain('deactivated');
  });
});
