import request from 'supertest';
import app from '../../server.js';
import Product from '../../models/Product.js';
import { createTestMerchant, createTestProduct, generateAccessToken } from '../helpers.js';
import { connectDB, disconnectDB, clearDB } from '../setup.js';

describe('Product API - Integration Tests', () => {
  beforeAll(connectDB);
  afterAll(disconnectDB);
  afterEach(clearDB);
  let merchantUser, merchant, product, token;

  beforeEach(async () => {
    const result = await createTestMerchant();
    merchantUser = result.user;
    merchant = result.merchant;
    token = generateAccessToken(merchantUser._id);
    product = await createTestProduct(merchant._id);
  });

  describe('GET /api/products', () => {
    it('should list all active and approved products', async () => {
      const res = await request(app).get('/api/products');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.products.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter products by category', async () => {
      const res = await request(app).get('/api/products?category=meat');
      expect(res.status).toBe(200);
      expect(res.body.products.every(p => p.category === 'meat')).toBe(true);
    });

    it('should support pagination', async () => {
      const res = await request(app).get('/api/products?page=1&limit=5');
      expect(res.status).toBe(200);
      expect(res.body.currentPage).toBe(1);
      expect(res.body.totalPages).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/products/search', () => {
    it('should return 400 when query is empty', async () => {
      const res = await request(app).get('/api/products/search');
      expect(res.status).toBe(400);
    });

    it('should find products by name', async () => {
      const res = await request(app).get('/api/products/search?q=Test');
      expect(res.status).toBe(200);
      expect(res.body.products.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/products/:id', () => {
    it('should return a single product', async () => {
      const res = await request(app).get(`/api/products/${product._id}`);
      expect(res.status).toBe(200);
      expect(res.body.product.name).toBe('Test Product');
    });

    it('should return 404 for non-existent product', async () => {
      const res = await request(app).get('/api/products/507f1f77bcf86cd799439011');
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/products', () => {
    it('should allow merchants to create a product', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .field('name', 'New Product')
        .field('description', 'Product description')
        .field('price', 200)
        .field('category', 'dairy')
        .field('stock', 10)
        .field('images', JSON.stringify([{ url: 'https://example.com/product.jpg', alt: 'New Product', isDefault: true }]));

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('should return 401 without auth', async () => {
      const res = await request(app)
        .post('/api/products')
        .send({ name: 'Test', description: 'desc', price: 10, category: 'meat', stock: 5 });

      expect(res.status).toBe(401);
    });

    it('should return 400 with missing required fields', async () => {
      const res = await request(app)
        .post('/api/products')
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Incomplete' });

      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/products/:id', () => {
    it('should allow merchant to update own product', async () => {
      const res = await request(app)
        .put(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${token}`)
        .send({ name: 'Updated Product', price: 150 });

      expect(res.status).toBe(200);
      expect(res.body.product.name).toBe('Updated Product');
    });
  });

  describe('DELETE /api/products/:id', () => {
    it('should soft-delete a product', async () => {
      const res = await request(app)
        .delete(`/api/products/${product._id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const deletedProduct = await Product.findById(product._id);
      expect(deletedProduct.isDeleted).toBe(true);
    });
  });
});
