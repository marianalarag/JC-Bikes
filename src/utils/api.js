import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api'
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
