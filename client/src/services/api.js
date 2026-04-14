import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Guard against redirect storms - only allow one redirect per 3 seconds
let isRedirecting = false;

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const currentPath = window.location.pathname;

      // Skip redirect if already on auth pages, or if a redirect is in progress
      if (currentPath !== '/login' && currentPath !== '/signup' && !isRedirecting) {
        isRedirecting = true;

        // Clear auth storage and redirect
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';

        // Reset the guard after 3s (in case redirect fails)
        setTimeout(() => { isRedirecting = false; }, 3000);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
