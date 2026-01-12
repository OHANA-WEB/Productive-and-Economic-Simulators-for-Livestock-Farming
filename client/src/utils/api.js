import axios from 'axios';
import { getAuthToken, removeAuthToken } from './auth';
import mockApi from './mockApi';

// Check if we should use mock API (demo mode)
// Force demo mode if:
// 1. VITE_USE_MOCK_API is set to 'true'
// 2. We're on Vercel (vercel.app domain) and no API URL is configured
// 3. We're in production build without API URL
const isVercel = window.location.hostname.includes('vercel.app');
const USE_MOCK_API = import.meta.env.VITE_USE_MOCK_API === 'true' || 
                     (isVercel && !import.meta.env.VITE_API_URL) ||
                     (import.meta.env.PROD && !import.meta.env.VITE_API_URL);

// Try to detect if backend is available
let backendAvailable = !USE_MOCK_API;

// Only try to ping backend if not forced to use mock
if (!USE_MOCK_API) {
  // Try to ping backend on first load (silently)
  axios.get('/api/health', { timeout: 2000 })
    .then(() => {
      backendAvailable = true;
    })
    .catch(() => {
      backendAvailable = false;
      console.log('Backend not available, using mock API');
    });
} else {
  console.log('Demo mode: Using mock API');
}

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = getAuthToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors and fallback to mock
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    // If backend is not available or request failed, use mock API
    if (!backendAvailable || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
      backendAvailable = false;
      
      // Use mock API
      const method = error.config?.method?.toLowerCase() || 'get';
      const endpoint = error.config?.url?.replace(api.defaults.baseURL, '') || error.config?.url || '';
      
      try {
        if (method === 'get') {
          return await mockApi.get(endpoint);
        } else if (method === 'post') {
          return await mockApi.post(endpoint, error.config?.data ? JSON.parse(error.config.data) : {});
        } else if (method === 'delete') {
          return await mockApi.delete(endpoint);
        }
      } catch (mockError) {
        return Promise.reject(mockError);
      }
    }
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      removeAuthToken();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Wrapper to handle both real and mock API
const apiWrapper = {
  async get(endpoint) {
    if (!backendAvailable) {
      return mockApi.get(endpoint);
    }
    try {
      return await api.get(endpoint);
    } catch (error) {
      if (!backendAvailable || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        backendAvailable = false;
        return mockApi.get(endpoint);
      }
      throw error;
    }
  },
  
  async post(endpoint, data) {
    if (!backendAvailable) {
      return mockApi.post(endpoint, data);
    }
    try {
      return await api.post(endpoint, data);
    } catch (error) {
      if (!backendAvailable || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        backendAvailable = false;
        return mockApi.post(endpoint, data);
      }
      throw error;
    }
  },
  
  async delete(endpoint) {
    if (!backendAvailable) {
      return mockApi.delete(endpoint);
    }
    try {
      return await api.delete(endpoint);
    } catch (error) {
      if (!backendAvailable || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        backendAvailable = false;
        return mockApi.delete(endpoint);
      }
      throw error;
    }
  },
};

export default apiWrapper;
