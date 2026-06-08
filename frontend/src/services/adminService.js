import api from './api';

const adminService = {
    // Get dashboard statistics
    getDashboard: async () => {
        const response = await api.get('/admin/dashboard');
        return response.data;
    },

    // Get all users
    getAllUsers: async (params = {}) => {
        const queryString = new URLSearchParams(params).toString();
        const response = await api.get(`/admin/users?${queryString}`);
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

    // Verify a merchant
    verifyMerchant: async (id, data) => {
        const response = await api.put(`/admin/merchants/${id}/verify`, data);
        return response.data;
    },

    // Get pending profile updates
    getPendingProfileUpdates: async () => {
        const response = await api.get('/admin/users/pending-updates');
        return response.data;
    },

    // Approve or reject user profile update
    approveUserProfileUpdate: async (id, data) => {
        const response = await api.put(`/admin/users/${id}/profile-approval`, data);
        return response.data;
    },
};

export default adminService;
