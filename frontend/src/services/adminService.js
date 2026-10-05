import api from './api';

const adminService = {
    // Get dashboard statistics
    getDashboard: async () => {
        const response = await api.get('/admin/dashboard');
        return response.data;
    },

    // Get all users (server-side search/filter/sort/pagination)
    getAllUsers: async (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const response = await api.get(`/admin/users?${queryString}`);
        return response.data;
    },

    // Consumer listing for Customers Management (role pinned server-side)
    getConsumers: async (params = {}) => {
        const queryString = new URLSearchParams({ role: 'consumer', ...params }).toString();
        const response = await api.get(`/admin/users?${queryString}`);
        return response.data;
    },

    // Single consumer detail (identity, status, pending changes, orders)
    getConsumerById: async (id) => {
        const response = await api.get(`/admin/users/${id}`);
        return response.data;
    },

    // Update user role
    updateUserRole: async (id, role) => {
        const response = await api.put(`/admin/users/${id}/role`, { role });
        return response.data;
    },

    // Toggle user status (active/inactive)
    toggleUserStatus: async (id) => {
        const response = await api.put(`/admin/users/${id}/status`);
        return response.data;
    },

    // Get all merchants (admin view)
    getAllMerchants: async (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const response = await api.get(`/admin/merchants?${queryString}`);
        return response.data;
    },

    // Get a single merchant application (admin detail, includes documents)
    getMerchantById: async (id) => {
        const response = await api.get(`/admin/merchants/${id}`);
        return response.data;
    },

    // Verify a merchant (approve / reject / suspend / ...).
    // Rejection requires a rejectionReason; reviewer notes are optional.
    verifyMerchant: async (id, data) => {
        const response = await api.put(`/admin/merchants/${id}/verify`, data);
        return response.data;
    },

    // Get pending profile updates (genuine requests, server-paginated)
    getPendingProfileUpdates: async (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const response = await api.get(`/admin/users/pending-updates?${queryString}`);
        return response.data;
    },

    // Approve or reject user profile update
    approveUserProfileUpdate: async (id, data) => {
        const response = await api.put(`/admin/users/${id}/profile-approval`, data);
        return response.data;
    },
};

export default adminService;
