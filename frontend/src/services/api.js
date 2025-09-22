// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Helper function to make API calls
const apiCall = async (endpoint, options = {}) => {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    const response = await fetch(url, config);
    
    // Always try to parse the response body first
    let responseData;
    try {
      responseData = await response.json();
    } catch (e) {
      responseData = { message: 'Invalid server response' };
    }
    
    // Special handling for student-auth/create-access-code
    // If this is a setup required response, treat it as successful
    if (endpoint === '/student-auth/create-access-code' && !response.ok && responseData.needsSetup) {
      console.log('Special case: Treating needsSetup as successful response');
      return responseData;
    }
    
    // Check if response is successful
    if (!response.ok) {
      const errorMessage = responseData.error || responseData.message || `HTTP error! status: ${response.status}`;
      console.error(`API error (${url}):`, errorMessage, responseData);
      
      // Include additional data in the error
      const enhancedError = new Error(errorMessage);
      enhancedError.responseData = responseData;
      enhancedError.status = response.status;
      throw enhancedError;
    }

    return responseData;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// Authentication API
export const authAPI = {
  // Create access code (send SMS)
  createAccessCode: async (phoneNumber) => {
    return await apiCall('/auth/createAccessCode', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber }),
    });
  },

  // Validate access code (verify SMS) 
  validateAccessCode: async (phoneNumber, accessCode) => {
    return await apiCall('/auth/validateAccessCode', {
      method: 'POST',
      body: JSON.stringify({ phoneNumber, accessCode }),
    });
  },

//   // Set user type (instructor/student)
//   setUserType: async (tempToken, userType) => {
//     return await apiCall('/auth/setUserType', {
//       method: 'POST',
//       headers: {
//         'Authorization': `Bearer ${tempToken}`,
//       },
//       body: JSON.stringify({ userType }),
//     });
//   },

// Set user type (instructor/student)
setUserType: async (phoneNumber, userType) => {
  return await apiCall('/auth/setUserType', {
    method: 'POST',
    body: JSON.stringify({ phoneNumber, userType }),
  });
},

  // Verify session
  verifySession: async (token) => {
    return await apiCall('/auth/verify-session', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Logout
  logout: async (token) => {
    return await apiCall('/auth/logout', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};

// Instructor API
export const instructorAPI = {
  // Get current instructor details
  getCurrentInstructor: async (token) => {
    return await apiCall('/instructor/profile', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Get all students for an instructor
  getStudents: async (token) => {    
    return await apiCall('/instructor/students', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Add new student
  addStudent: async (studentData, token) => {
    try {
      console.log('API addStudent called with data:', studentData);
      
      // Use the new endpoint format
      const url = `${API_BASE_URL}/instructor/addStudent`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json', // Đảm bảo content-type là application/json
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(studentData),
      });
      
      let responseData;
      try {
        responseData = await response.json();
      } catch (error) {
        responseData = { success: false, message: 'Invalid server response' };
      }
      
      if (!response.ok) {
        const errorMessage = responseData.error || responseData.message || `HTTP error! status: ${response.status}`;
        console.error(`API error:`, errorMessage, responseData);
        return { success: false, message: errorMessage };
      }
      
      return responseData;
    } catch (error) {
      console.error('Add student API error:', error);
      return { success: false, message: error.message };
    }
  },

  // Get single student by phone
  getStudent: async (phone, token) => {
    return await apiCall(`/instructor/student/${phone}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Update student
  editStudent: async (studentId, studentData, token) => {
    return await apiCall(`/instructor/student/${studentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(studentData),
    });
  },

  // Delete student
  deleteStudent: async (studentId, token) => {
    return await apiCall(`/instructor/student/${studentId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Create a lesson for students
  createLesson: async (lessonData, token) => {
    return await apiCall('/instructor/assignLesson', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(lessonData),
    });
  },

  // Get all lessons for an instructor
  getLessons: async (token) => {
    return await apiCall('/instructor/lessons', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Update lesson
  updateLesson: async (lessonId, lessonData, token) => {
    return await apiCall(`/instructor/lesson/${lessonId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(lessonData),
    });
  },

  // Delete lesson
  deleteLesson: async (lessonId, token) => {
    return await apiCall(`/instructor/lesson/${lessonId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};

// Student API
export const studentAPI = {
  // Create access code for student login via email
  createAccessCode: async (email) => {
    return await apiCall('/student-auth/create-access-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Validate access code for student login
  validateAccessCode: async (email, accessCode) => {
    return await apiCall('/student-auth/validate-access-code', {
      method: 'POST',
      body: JSON.stringify({ email, accessCode }),
    });
  },
  
  // Login with email (alternative login method)
  loginEmail: async (email, password) => {
    return await apiCall('/student/loginEmail', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  },

  // Get student's assigned lessons
  getMyLessons: async (token) => {
    return await apiCall('/student/myLessons', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Mark lesson as completed
  markLessonDone: async (lessonData, token) => {
    return await apiCall('/student/markLessonDone', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(lessonData),
    });
  },

  // Update student profile
  editProfile: async (profileData, token) => {
    return await apiCall('/student/editProfile', {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(profileData),
    });
  },
  
  // Verify student setup token from email link
  verifySetupToken: async (token, email) => {
    return await apiCall('/student-auth/verify-setup-token', {
      method: 'POST',
      body: JSON.stringify({ token, email }),
    });
  },
  
  // Complete student account setup with password
  completeStudentSetup: async (setupData) => {
    return await apiCall('/student-auth/setup-account', {
      method: 'POST',
      body: JSON.stringify(setupData),
    });
  },
  
  // Get information about an instructor for chat purposes
  getInstructors: async (token) => {
    return await apiCall('/student/getInstructors', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
  
  // Get unread messages count
  getUnreadMessagesCount: async (token) => {
    return await apiCall('/chat/unread-count', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }
};

// Chat API
export const chatAPI = {
  // Get user chat rooms
  getChatRooms: async (userId, token) => {
    return await apiCall(`/chat/chatRooms/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Get chat history for a room
  getChatHistory: async (roomId, token) => {
    return await apiCall(`/chat/messages/${roomId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Send message
  sendMessage: async (messageData, token) => {
    return await apiCall('/chat/sendMessage', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(messageData),
    });
  },

  // Mark messages as read
  markAsRead: async (roomId, token) => {
    return await apiCall(`/chat/markAsRead/${roomId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },

  // Create test data (for development)
  createTestData: async (token) => {
    return await apiCall('/chat/createTestData', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  },
};

// Student Auth API
export const studentAuthAPI = {
  // Create access code (send email)
  createAccessCode: async (email) => {
    return await apiCall('/student-auth/create-access-code', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },

  // Validate access code (verify email OTP) 
  validateAccessCode: async (email, accessCode) => {
    return await apiCall('/student-auth/validate-access-code', {
      method: 'POST',
      body: JSON.stringify({ email, accessCode }),
    });
  },

  // Verify setup token
  verifySetupToken: async (token, email) => {
    return await apiCall('/student-auth/verify-setup-token', {
      method: 'POST',
      body: JSON.stringify({ token, email }),
    });
  },

  // Setup student account
  setupAccount: async (token, name, email, password) => {
    return await apiCall('/student-auth/setup-account', {
      method: 'POST',
      body: JSON.stringify({ token, name, email, password }),
    });
  },

  // Logout
  logout: async (email) => {
    return await apiCall('/student-auth/logout', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  },
};