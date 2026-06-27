import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Merchant from '../models/Merchant.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
process.env.JWT_SECRET = 'test-jwt-secret-key-at-least-32-chars!!';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-at-least-32-chars!';
process.env.JWT_EXPIRES_IN = '15m';
process.env.JWT_REFRESH_EXPIRES_IN = '7d';
process.env.CLIENT_URL = 'http://localhost:3000';
process.env.NODE_ENV = 'test';

export const createTestUser = async (overrides = {}) => {
  const userData = {
    firstName: 'Test',
    lastName: 'User',
    email: `test-${Date.now()}@example.com`,
    password: 'testPassword123!',
    phone: '+251912345678',
    role: 'consumer',
    ...overrides,
  };
  return User.create(userData);
};

export const createTestMerchant = async (overrides = {}) => {
  const user = await createTestUser({ role: 'merchant', ...overrides.user });
  const merchantData = {
    user: user._id,
    businessName: 'Test Business',
    description: 'A test business for testing',
    businessType: 'other',
    businessPhone: '+251912345678',
    verificationStatus: 'approved',
    ...overrides,
  };
  const merchant = await Merchant.create(merchantData);
  return { user, merchant };
};

export const createTestProduct = async (merchantId, overrides = {}) => {
  const productData = {
    merchant: merchantId,
    name: 'Test Product',
    description: 'A test product description',
    price: 100,
    category: 'meat',
    stock: 50,
    images: [{ url: 'http://example.com/image.jpg', alt: 'Test' }],
    isActive: true,
    isApproved: true,
    ...overrides,
  };
  return Product.create(productData);
};

export const createTestCart = async (userId, items = []) => {
  return Cart.create({ user: userId, items });
};

export const generateAccessToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: '15m' });
};
