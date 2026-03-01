import api from './api';

const productService = {
    // Get all products with filters & pagination
    getAll: async (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const response = await api.get(`/products?${queryString}`);
        return response.data;
    },

    // Get single product
    getById: async (id) => {
        const response = await api.get(`/products/${id}`);
        return response.data;
    },

    // Search products
    search: async (query, params = {}) => {
        const queryString = new URLSearchParams({ q: query, ...params }).toString();
        const response = await api.get(`/products/search?${queryString}`);
        return response.data;
    },

    // Create product (merchant)
    create: async (productData) => {
        const response = await api.post('/products', productData);
        return response.data;
    },

    // Update product (merchant)
    update: async (id, productData) => {
        const response = await api.put(`/products/${id}`, productData);
        return response.data;
    },

    // Delete product
    delete: async (id) => {
        const response = await api.delete(`/products/${id}`);
        return response.data;
    },
};

export default productService;
