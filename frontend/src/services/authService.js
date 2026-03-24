import api from './api';

const authService = {
    register: async (userData) => {
        const response = await api.post('/auth/register', userData);
        // Backend returns { success, accessToken, user }
        const token = response.data.accessToken || response.data.token;
        if (token) {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return { ...response.data, token };
    },

    login: async (credentials) => {
        const response = await api.post('/auth/login', credentials);
        // Backend returns { success, accessToken, user }
        const token = response.data.accessToken || response.data.token;
        if (token) {
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
        }
        return { ...response.data, token };
    },

    logout: async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            // Logout even if API call fails
        }
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    },

    getProfile: async () => {
        const response = await api.get('/users/profile');
        return response.data;
    },

    updateProfile: async (data) => {
        const response = await api.put('/users/profile', data);
        return response.data;
    },

    forgotPassword: async (email) => {
        const response = await api.post('/auth/forgot-password', { email });
        return response.data;
    },

    resetPassword: async (token, password) => {
        const response = await api.put(`/auth/reset-password/${token}`, { password });
        return response.data;
    },

    getCurrentUser: () => {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    getToken: () => localStorage.getItem('token'),
    isAuthenticated: () => !!localStorage.getItem('token'),
};

export default authService;
