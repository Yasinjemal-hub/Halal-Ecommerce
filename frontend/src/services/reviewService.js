import api from './api';

const reviewService = {
    create: async (data) => {
        const response = await api.post('/reviews', data);
        return response.data;
    },
    getByProduct: async (productId, params = {}) => {
        const qs = new URLSearchParams(params).toString();
        const response = await api.get(`/reviews/product/${productId}${qs ? `?${qs}` : ''}`);
        return response.data;
    },
};

export default reviewService;
