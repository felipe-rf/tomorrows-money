// Configuration constants for the application
export const CONFIG = {
  // API URLs
  API: {
    BASE_URL: "http://localhost:3001/api",
    TIMEOUT: 10000,
  },

  // Local Storage Keys
  STORAGE_KEYS: {
    TOKEN: "token",
    USER: "user",
  },

  // App Settings
  APP: {
    NAME: "Tomorrow's Money",
    VERSION: "1.0.0",
  },

  // Pagination defaults
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 10,
    MAX_PAGE_SIZE: 100,
  },
} as const;

export default CONFIG;
