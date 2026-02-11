import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to all requests
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('admin_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Handle 401/403 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 403) {
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const adminAuthApi = {
  login: (email: string, password: string) =>
    api.post('/api/admin/login', { email, password }),
  logout: () => api.post('/api/admin/logout'),
  me: () => api.get('/api/admin/me'),
};

export const adminApi = {
  getAll: () => api.get('/api/admin/admins'),
  create: (data: { email: string; password: string; name: string }) =>
    api.post('/api/admin/admins', data),
  delete: (id: number) => api.delete(`/api/admin/admins/${id}`),
};

export const deviceApi = {
  getAll: () => api.get('/api/admin/devices'),
  register: (data: { deviceId: string; devicePassword: string; name: string; location: string }) =>
    api.post('/api/admin/devices/register', data),
  update: (deviceId: string, data: { name?: string; location?: string; active?: boolean }) =>
    api.put(`/api/admin/devices/${deviceId}`, data),
  updatePassword: (deviceId: string, devicePassword: string) =>
    api.put(`/api/admin/devices/${deviceId}/password`, { devicePassword }),
  toggleLicense: (deviceId: string, licenseEnabled: boolean) =>
    api.put(`/api/admin/devices/${deviceId}/license`, { licenseEnabled }),
  delete: (deviceId: string) => api.delete(`/api/admin/devices/${deviceId}`),
};

export const statsApi = {
  getDashboard: () => api.get('/api/admin/stats'),
};

export default api;
