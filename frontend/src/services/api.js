import axios from 'axios';

// Prefer explicit REACT_APP_API_URL. If not set, default to backend URL in dev
let API_URL = process.env.REACT_APP_API_URL;
if (!API_URL) {
    // If running in the browser on localhost during development, point directly to backend
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
        API_URL = 'http://localhost:5000/api';
    } else {
        API_URL = '/api';
    }
}

const api = axios.create({
    baseURL: API_URL,
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
                    await axios.post(`${API_URL}/auth/refresh-token`, {}, { withCredentials: true });
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
        const response = await api.get('/health');
        return response.data;
    } catch (error) {
        console.error('Backend health check failed:', error.message);
        return { success: false, message: 'Backend is not reachable' };
    }
};

export default api;
