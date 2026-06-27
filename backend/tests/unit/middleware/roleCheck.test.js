import { authorize } from '../../../middleware/roleCheck.js';

const mockResponse = () => {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  return res;
};

describe('Role Check Middleware - authorize', () => {
  it('should return 401 if no user on request', () => {
    const middleware = authorize('admin');
    const req = {};
    const res = mockResponse();
    const next = () => {};

    middleware(req, res, next);
    expect(res.statusCode).toBe(401);
    expect(res.body.message).toBe('Not authorized — please log in');
  });

  it('should return 403 if user role is not in allowed roles', () => {
    const middleware = authorize('admin');
    const req = { user: { role: 'consumer' } };
    const res = mockResponse();
    const next = () => {};

    middleware(req, res, next);
    expect(res.statusCode).toBe(403);
    expect(res.body.message).toContain('not authorized');
  });

  it('should call next if user role is in allowed roles', () => {
    const middleware = authorize('admin');
    const req = { user: { role: 'admin' } };
    const res = mockResponse();
    let calledNext = false;
    const next = () => { calledNext = true; };

    middleware(req, res, next);
    expect(calledNext).toBe(true);
  });

  it('should allow multiple roles', () => {
    const middleware = authorize('admin', 'merchant');
    const req = { user: { role: 'merchant' } };
    const res = mockResponse();
    let calledNext = false;
    const next = () => { calledNext = true; };

    middleware(req, res, next);
    expect(calledNext).toBe(true);
  });
});
