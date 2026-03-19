import api from './api';

const cartService = {
    // Get user's server-side cart
    getCart: async () => {
        const response = await api.get('/cart');
        return response.data;
    },

    // Add item to server cart
    addToCart: async (productId, quantity = 1) => {
        const response = await api.post('/cart', { productId, quantity });
        return response.data;
    },

    // Update cart item quantity
    updateItem: async (itemId, quantity) => {
        const response = await api.put(`/cart/${itemId}`, { quantity });
        return response.data;
    },

    // Remove item from cart
    removeItem: async (itemId) => {
        const response = await api.delete(`/cart/${itemId}`);
        return response.data;
    },

    // Clear entire cart
    clearCart: async () => {
        const response = await api.delete('/cart');
        return response.data;
    },
};

export default cartService;
