import api from './api';

const merchantService = {
    // Get all merchants (public listing)
    getAll: async (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const response = await api.get(`/merchants?${queryString}`);
        return response.data;
    },

    // Get featured merchants (for homepage)
    getFeatured: async (limit = 6) => {
        const response = await api.get(`/merchants/featured?limit=${limit}`);
        return response.data;
    },

    // Get single merchant by ID
    getById: async (id) => {
        const response = await api.get(`/merchants/${id}`);
        return response.data;
    },

    // Get merchant's products
    getMerchantProducts: async (id, params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const response = await api.get(`/merchants/${id}/products?${queryString}`);
        return response.data;
    },

    // Get my merchant profile (for logged-in merchants)
    getMyProfile: async () => {
        const response = await api.get('/merchants/me/profile');
        return response.data;
    },

    // Create merchant profile
    create: async (merchantData) => {
        const response = await api.post('/merchants', merchantData);
        return response.data;
    },

    // Update merchant profile
    update: async (id, merchantData) => {
        const response = await api.put(`/merchants/${id}`, merchantData);
        return response.data;
    },

    // Apply for halal certification
    applyCertification: async (id, certData) => {
        const response = await api.post(`/merchants/${id}/certifications`, certData);
        return response.data;
    },
};

export default merchantService;
