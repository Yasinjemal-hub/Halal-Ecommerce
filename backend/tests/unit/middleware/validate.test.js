import { jest } from '@jest/globals';

jest.unstable_mockModule('express-validator', () => ({
  validationResult: jest.fn(),
}));

const { default: validate } = await import('../../../middleware/validate.js');
const { validationResult } = await import('express-validator');

const mockResponse = () => {
  const res = {};
  res.status = (code) => { res.statusCode = code; return res; };
  res.json = (data) => { res.body = data; return res; };
  return res;
};

describe('Validation Middleware - validate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should call next when there are no errors', () => {
    validationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => [],
    });

    const req = {};
    const res = mockResponse();
    let calledNext = false;
    const next = () => { calledNext = true; };

    validate(req, res, next);
    expect(calledNext).toBe(true);
  });

  it('should return 400 with errors when validation fails', () => {
    const errorsArray = [
      { path: 'email', msg: 'Please provide a valid email' },
    ];

    validationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => errorsArray,
    });

    const req = {};
    const res = mockResponse();
    let calledNext = false;
    const next = () => { calledNext = true; };

    validate(req, res, next);
    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toBe('Validation failed');
  });
});