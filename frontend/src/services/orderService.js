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

    // Cancel an order (consumer owner: pending/confirmed -> cancelled)
    cancel: async (id, cancelReason) => {
        const response = await api.put(`/orders/${id}/cancel`, cancelReason ? { cancelReason } : {});
        return response.data;
    },

    // Request a return (consumer owner: delivered -> return_requested)
    requestReturn: async (id, returnReason) => {
        const response = await api.put(`/orders/${id}/return`, returnReason ? { returnReason } : {});
        return response.data;
    },

    // Process a refund (admin/superadmin only)
    refund: async (id, payload = {}) => {
        const response = await api.put(`/orders/${id}/refund`, payload);
        return response.data;
    },

    // Get merchant orders (for merchant dashboard)
    getMerchantOrders: async (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const response = await api.get(`/orders/merchant/orders?${queryString}`);
        return response.data;
    },

    // Update order status (merchant: own items only; admin/superadmin).
    // Allowed merchant chain: pending -> confirmed -> processing -> shipped
    //   -> out_for_delivery -> delivered. Extra fields (note, trackingNumber,
    //   deliveryPartner, estimatedDelivery) are forwarded when provided.
    updateStatus: async (id, status, extra = {}) => {
        const response = await api.put(`/orders/${id}/status`, { status, ...extra });
        return response.data;
    },
};

export default orderService;
