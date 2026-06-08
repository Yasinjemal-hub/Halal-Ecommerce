import axios from 'axios';

const getApiUrl = () => {
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }
    if (typeof window !== 'undefined') {
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'http://localhost:5000/api';
        }
        return `${window.location.origin}/api`;
    }
    return '/api';
};

const api = axios.create({
    baseURL: getApiUrl(),
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor — no Authorization header required when using httpOnly cookies
// The server will read accessToken from the httpOnly cookie. Keep withCredentials:true above.
api.interceptors.request.use((config) => config, (error) => Promise.reject(error));

// Response interceptor — handle errors globally
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retrying, try to refresh token
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

                try {
                    // Attempt token refresh - new access token will be set as httpOnly cookie by server
                    const refreshUrl = getApiUrl() + '/auth/refresh-token';
                    await axios.post(refreshUrl, {}, { withCredentials: true });
                    // Retry original request (cookies sent automatically)
                    return api(originalRequest);
                } catch (refreshError) {
                    // Refresh failed — force logout client-side
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
        const healthUrl = getApiUrl() + '/health';
        const response = await axios.get(healthUrl, { withCredentials: true, timeout: 10000 });
        return response.data;
    } catch (error) {
        console.error('Backend health check failed:', error.message);
        return { success: false, message: 'Backend is not reachable' };
    }
};

export default api;
