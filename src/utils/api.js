import axios from 'axios';

const configuredApiOrigin = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const API_BASE_URL = configuredApiOrigin ? `${configuredApiOrigin}/api` : '/api';

export const resolveApiUrl = (resourceUrl = '') => {
    if (!resourceUrl) return resourceUrl;
    if (/^https?:\/\//i.test(resourceUrl)) return resourceUrl;
    if (!configuredApiOrigin && resourceUrl.startsWith('/uploads')) {
        return `/api${resourceUrl}`;
    }
    return `${configuredApiOrigin}${resourceUrl.startsWith('/') ? resourceUrl : `/${resourceUrl}`}`;
};

const api = axios.create({
    baseURL: API_BASE_URL
});

// Interceptor de peticiones para inyectar automáticamente el token JWT
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;
        const message = error.response?.data?.error || '';
        const expiredSession =
            status === 401 ||
            (status === 403 && message.toLowerCase().includes('token'));

        if (expiredSession) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.setItem(
                'sessionMessage',
                'Tu sesión expiró. Inicia sesión nuevamente.'
            );

            if (window.location.pathname !== '/login') {
                window.location.assign('/login');
            }
        }

        return Promise.reject(error);
    }
);

export default api;
