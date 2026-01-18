import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // Important for sending cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API
export const authApi = {
  register: async (data: {
    email: string;
    password: string;
    name: string;
    mobileNumber: string;
  }) => {
    const response = await api.post('/api/auth/register', data);
    return response.data;
  },

  login: async (data: { email: string; password: string }) => {
    const response = await api.post('/api/auth/login', data);
    return response.data;
  },

  logout: async () => {
    const response = await api.post('/api/auth/logout');
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/api/auth/me');
    return response.data;
  },
};

// Device API
export const deviceApi = {
  getAllDevices: async () => {
    const response = await api.get('/api/devices');
    return response.data;
  },

  getDeviceDashboard: async (deviceId: string) => {
    const response = await api.get(`/api/devices/${deviceId}/dashboard`);
    return response.data;
  },

  getDeviceThresholds: async (deviceId: string) => {
    const response = await api.get(`/api/devices/${deviceId}/thresholds`);
    return response.data;
  },

  updateThreshold: async (
    deviceId: string,
    parameter: string,
    minValue: number,
    maxValue: number
  ) => {
    const response = await api.put(
      `/api/devices/${deviceId}/thresholds/${parameter}`,
      { minValue, maxValue }
    );
    return response.data;
  },

  createDevice: async (data: {
    deviceId: string;
    name: string;
    location: string;
  }) => {
    const response = await api.post('/api/devices', data);
    return response.data;
  },

  attachDevice: async (data: {
    deviceId: string;
    devicePassword: string;
  }) => {
    const response = await api.post('/api/devices/attach', data);
    return response.data;
  },
};
