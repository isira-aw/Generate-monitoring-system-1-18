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

  forgotPassword: async (data: { email: string }) => {
    const response = await api.post('/api/auth/forgot-password', data);
    return response.data;
  },

  resetPassword: async (data: { email: string; code: string; newPassword: string }) => {
    const response = await api.post('/api/auth/reset-password', data);
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

  registerDevice: async (data: {
    deviceId: string;
    devicePassword: string;
    name: string;
    location: string;
  }) => {
    const response = await api.post('/api/devices/register', data);
    return response.data;
  },

  requestDeviceVerification: async (deviceId: string) => {
    const response = await api.post(`/api/devices/${deviceId}/request-verification`);
    return response.data;
  },

  verifyDeviceCode: async (deviceId: string, code: string) => {
    const response = await api.post(`/api/devices/${deviceId}/verify-code`, { deviceId, code });
    return response.data;
  },

  updateDevicePassword: async (deviceId: string, devicePassword: string) => {
    const response = await api.put(`/api/devices/${deviceId}/password`, { devicePassword });
    return response.data;
  },

  detachDevice: async (deviceId: string) => {
    const response = await api.delete(`/api/devices/${deviceId}/detach`);
    return response.data;
  },

  deleteDevice: async (deviceId: string) => {
    const response = await api.delete(`/api/devices/${deviceId}`);
    return response.data;
  },

  updateDeviceInfo: async (deviceId: string, name: string, location: string) => {
    const response = await api.put(`/api/devices/${deviceId}/info`, { name, location });
    return response.data;
  },
};

// Profile API
export const profileApi = {
  updateProfile: async (data: {
    name?: string;
    email?: string;
    mobileNumber?: string;
  }) => {
    const response = await api.put('/api/profile', data);
    return response.data;
  },

  changePassword: async (data: {
    currentPassword: string;
    newPassword: string;
  }) => {
    const response = await api.post('/api/profile/change-password', data);
    return response.data;
  },
};

// History API
export const historyApi = {
  queryHistory: async (data: {
    deviceId: string;
    startTime: string;
    endTime: string;
    parameters?: string[];
  }) => {
    const response = await api.post('/api/history/query', data);
    return response.data;
  },

  getHistory: async (
    deviceId: string,
    startTime: string,
    endTime: string,
    parameters?: string[]
  ) => {
    const params = new URLSearchParams({
      startTime,
      endTime,
    });
    if (parameters && parameters.length > 0) {
      parameters.forEach(param => params.append('parameters', param));
    }
    const response = await api.get(
      `/api/history/data/${deviceId}?${params.toString()}`
    );
    return response.data;
  },

  generatePdfReport: async (data: {
    deviceId: string;
    startTime: string;
    endTime: string;
    parameters: string[];
  }) => {
    const response = await api.post('/api/history/report/pdf', data, {
      responseType: 'blob',
    });
    return response.data;
  },

  getParameters: async () => {
    const response = await api.get('/api/history/parameters');
    return response.data;
  },

  getOldRecordsCount: async () => {
    const response = await api.get('/api/history/cleanup/count');
    return response.data;
  },

  triggerCleanup: async () => {
    const response = await api.post('/api/history/cleanup');
    return response.data;
  },

  getRpmChartData: async (deviceId: string, date: string) => {
    const response = await api.get(`/api/history/rpm-chart/${deviceId}?date=${date}`);
    return response.data;
  },
};
