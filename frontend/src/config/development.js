// Development configuration
export const DEV_CONFIG = {
  // API Configuration
  API_BASE_URL: import.meta.env.MODE === 'production' 
    ? 'https://your-production-api.com/api'
    : 'http://localhost:5000/api',
  
  // Development features
  SHOW_OTP_HELPER: import.meta.env.MODE === 'development',
  MOCK_SMS_ENABLED: import.meta.env.MODE === 'development',
  
  // Default OTP codes for testing
  TEST_OTP_CODES: ['123456', '111111', '000000', '999999'],
  
  // Development utilities
  AUTO_FILL_DEMO_DATA: import.meta.env.MODE === 'development',
  CONSOLE_LOGGING: import.meta.env.MODE === 'development',
  
  // Mock data
  DEMO_PHONE_NUMBERS: [
    '+84932583717',
    '+84123456789',
    '+84987654321'
  ],
  
  DEMO_USERS: {
    instructor: {
      name: 'Demo Instructor',
      phone: '+84932583717',
      email: 'instructor@demo.com',
      role: 'instructor'
    },
    student: {
      name: 'Demo Student', 
      phone: '+84123456789',
      email: 'student@demo.com',
      role: 'student'
    }
  }
};

// Helper functions
export const isDevelopment = () => {
  return import.meta.env.MODE === 'development' || 
         window.location.hostname === 'localhost' || 
         window.location.hostname === '127.0.0.1';
};

export const isProduction = () => {
  return import.meta.env.MODE === 'production';
};

export const shouldShowOTPHelper = () => {
  return isDevelopment() && DEV_CONFIG.SHOW_OTP_HELPER;
};

export const getAPIBaseURL = () => {
  return DEV_CONFIG.API_BASE_URL;
};