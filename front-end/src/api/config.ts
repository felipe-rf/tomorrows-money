import axios from "axios";

// API Base Configuration - browser-safe URL detection
const getApiUrl = () => {
  // Check if we're in development mode (localhost)
  if (
    typeof window !== "undefined" &&
    window.location.hostname === "localhost"
  ) {
    return "http://localhost:3001/api";
  }
  // For production, replace with your production API URL
  return "https://your-production-api.com/api";
};

export const API_BASE_URL = getApiUrl();

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000, // Reduced from 10000ms to 5000ms
  headers: {
    "Content-Type": "application/json",
  },
});

// Performance tracking
const requestTimes = new Map<string, number>();

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const requestId = `${config.method}-${config.url}-${Date.now()}`;
    requestTimes.set(requestId, performance.now());
    config.headers["X-Request-ID"] = requestId;

    const token = localStorage.getItem("token");
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and performance monitoring
api.interceptors.response.use(
  (response) => {
    const requestId = response.config.headers["X-Request-ID"] as string;
    const startTime = requestTimes.get(requestId);

    if (startTime) {
      const duration = performance.now() - startTime;
      requestTimes.delete(requestId);

      if (duration > 1000) {
        console.warn(
          `🐌 Slow API call: ${response.config.method?.toUpperCase()} ${
            response.config.url
          } took ${duration.toFixed(2)}ms`
        );
      } else {
        console.log(
          `⚡ API call: ${response.config.method?.toUpperCase()} ${
            response.config.url
          } took ${duration.toFixed(2)}ms`
        );
      }
    }

    return response;
  },
  (error) => {
    const requestId = error.config?.headers?.["X-Request-ID"] as string;
    const startTime = requestTimes.get(requestId);

    if (startTime) {
      const duration = performance.now() - startTime;
      requestTimes.delete(requestId);
      console.error(
        `❌ API error: ${error.config?.method?.toUpperCase()} ${
          error.config?.url
        } failed after ${duration.toFixed(2)}ms`
      );
    }

    if (error.response?.status === 401) {
      // Unauthorized - clear token and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
    }
    return Promise.reject(error);
  }
);

export default api;
