import jwt from 'jsonwebtoken';
import { generateAccessToken, generateRefreshToken } from '../../../utils/generateToken.js';

describe('Token Generation Utilities', () => {
  const testUserId = '507f1f77bcf86cd799439011';

  describe('generateAccessToken', () => {
    it('should generate a valid JWT access token', () => {
      const token = generateAccessToken(testUserId);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      expect(decoded.id).toBe(testUserId);
    });

    it('should have an expiration', () => {
      const token = generateAccessToken(testUserId);
      const decoded = jwt.decode(token);
      expect(decoded.exp).toBeDefined();
      expect(decoded.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a valid JWT refresh token', () => {
      const token = generateRefreshToken(testUserId);
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET);
      expect(decoded.id).toBe(testUserId);
    });

    it('should have longer expiration than access token', () => {
      const accessToken = generateAccessToken(testUserId);
      const refreshToken = generateRefreshToken(testUserId);

      const accessDecoded = jwt.decode(accessToken);
      const refreshDecoded = jwt.decode(refreshToken);

      expect(refreshDecoded.exp - refreshDecoded.iat).toBeGreaterThan(
        accessDecoded.exp - accessDecoded.iat
      );
    });
  });
});
