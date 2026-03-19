import api from './api';

const orderService = {
    // Create a new order
    create: async (orderData) => {
        const response = await api.post('/orders', orderData);
        return response.data;
    },

    // Get current user's orders
    getMyOrders: async (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const response = await api.get(`/orders/my-orders?${queryString}`);
        return response.data;
    },

    // Get single order by ID
    getById: async (id) => {
        const response = await api.get(`/orders/${id}`);
        return response.data;
    },

    // Cancel an order
    cancel: async (id) => {
        const response = await api.put(`/orders/${id}/cancel`);
        return response.data;
    },

    // Get merchant orders (for merchant dashboard)
    getMerchantOrders: async (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const response = await api.get(`/orders/merchant/orders?${queryString}`);
        return response.data;
    },

    // Update order status (merchant/admin)
    updateStatus: async (id, status) => {
        const response = await api.put(`/orders/${id}/status`, { status });
        return response.data;
    },
};

export default orderService;
