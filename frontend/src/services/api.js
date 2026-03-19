import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor — attach token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor — handle errors globally
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retrying, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // Attempt token refresh
                const refreshResponse = await axios.post(
                    `${API_URL}/auth/refresh-token`,
                    {},
                    { withCredentials: true }
                );

                if (refreshResponse.data.accessToken) {
                    localStorage.setItem('token', refreshResponse.data.accessToken);
                    originalRequest.headers.Authorization = `Bearer ${refreshResponse.data.accessToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                // Refresh failed — force logout
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
                return Promise.reject(refreshError);
            }
        }

        // Handle network errors
        if (!error.response) {
            console.error('Network error — backend may be down:', error.message);
        }

        return Promise.reject(error);
    }
);

// Health check utility
export const checkBackendHealth = async () => {
    try {
        const response = await api.get('/health');
        return response.data;
    } catch (error) {
        console.error('Backend health check failed:', error.message);
        return { success: false, message: 'Backend is not reachable' };
    }
};

export default api;
