import React, { createContext, useReducer, useEffect } from 'react';
import { authAPI } from '../services/api';

// Initial state
const initialState = {
  user: null,
  token: null,
  isAuthenticated: false,
  loading: true,
  error: null,
};

// Action types
const AUTH_ACTIONS = {
  SET_LOADING: 'SET_LOADING',
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_ERROR: 'SET_ERROR',
  CLEAR_ERROR: 'CLEAR_ERROR',
  UPDATE_USER: 'UPDATE_USER',
};

// Reducer
const authReducer = (state, action) => {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload,
      };
    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        isAuthenticated: true,
        loading: false,
        error: null,
      };
    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        loading: false,
      };
    case AUTH_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false,
      };
    case AUTH_ACTIONS.CLEAR_ERROR:
      return {
        ...state,
        error: null,
      };
    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };
    default:
      return state;
  }
};

// Create context
const AuthContext = createContext();

// Provider component
export const AuthProvider = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // Load user from localStorage on mount
  useEffect(() => {
    const loadStoredAuth = async () => {
      try {
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('authUser');
        const storedUserType = localStorage.getItem('userType'); // Also check userType

        console.log('AuthContext - Loading stored auth data:', { 
          hasToken: !!storedToken, 
          hasUser: !!storedUser,
          userType: storedUserType 
        });
        
        if (storedToken && (storedUser || storedUserType)) {
          try {
            // Parse the stored user or create a minimal user object from userType
            let userObject;
            if (storedUser) {
              try {
                userObject = JSON.parse(storedUser);
              } catch (e) {
                console.error('Failed to parse stored user JSON:', e);
                // Create a minimal user object as fallback
                userObject = { userType: storedUserType || 'student' };
              }
            } else if (storedUserType) {
              // Create a minimal user object if only userType exists
              userObject = { userType: storedUserType };
            }
            
            // Try to verify token with backend, but don't fail if server is unavailable
            try {
              const response = await authAPI.verifySession(storedToken);
              
              if (response && response.success) {
                console.log('Session verified successfully:', response);
                dispatch({
                  type: AUTH_ACTIONS.LOGIN_SUCCESS,
                  payload: {
                    user: userObject,
                    token: storedToken,
                  },
                });
              } else {
                console.log('Session verification failed:', response);
                // Token is invalid, clear storage
                localStorage.removeItem('authToken');
                localStorage.removeItem('authUser');
                localStorage.removeItem('userType');
                dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
              }
            } catch (verifyError) {
              console.warn('Failed to verify session with server:', verifyError);
              // If server is down or unreachable, proceed with stored credentials
              // This prevents login failures when the server is temporarily unavailable
              console.log('Proceeding with stored credentials due to server verification failure');
              dispatch({
                type: AUTH_ACTIONS.LOGIN_SUCCESS,
                payload: {
                  user: userObject,
                  token: storedToken,
                },
              });
            }
          } catch (parseError) {
            console.error('Error parsing stored user data:', parseError);
            localStorage.removeItem('authUser');
            dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
          }
        } else {
          console.log('No stored authentication data found');
          dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
        }
      } catch (error) {
        console.error('Failed to verify session:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('authUser');
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    };

    loadStoredAuth();
  }, []);

  // Login function
  const login = (user, token) => {
    console.log('🔑 Login called with user:', user, 'and token:', token);
    
    // Ensure we have valid data
    if (!user || !token) {
      console.error('Invalid login data:', { user, token });
      return;
    }
    
    try {
      // Make sure we have at least a userType
      const userWithDefaults = {
        ...user,
        userType: user.userType || localStorage.getItem('userType') || 'student' 
      };
      
      // Store in localStorage
      localStorage.setItem('authToken', token);
      localStorage.setItem('authUser', JSON.stringify(userWithDefaults));
      localStorage.setItem('userType', userWithDefaults.userType);
      
      // Store userId for API calls
      if (userWithDefaults.id) {
        localStorage.setItem('userId', userWithDefaults.id);
      } else if (userWithDefaults.email) {
        // Use email as fallback ID if no id is provided
        localStorage.setItem('userId', userWithDefaults.email);
      }
  
      // Update application state - must happen before any potential navigation
      dispatch({
        type: AUTH_ACTIONS.LOGIN_SUCCESS,
        payload: { user: userWithDefaults, token },
      });
      
      console.log('✅ User successfully logged in as', userWithDefaults.userType);
      console.log('📊 Auth state after login:', {
        user: userWithDefaults,
        token,
        type: userWithDefaults.userType
      });
      
      // Force app to recognize auth state immediately
      setTimeout(() => {
        // Check if auth state is properly reflected
        const currentAuthState = JSON.parse(localStorage.getItem('authUser'));
        console.log('⏱️ Checking auth state after timeout:', currentAuthState);
        
        // Only force reload as last resort if needed
        if (currentAuthState && !state.isAuthenticated) {
          console.log('⚠️ Auth state inconsistency detected - forcing update');
          window.location.href = '/';
        }
      }, 1000);
    } catch (error) {
      console.error('Login error:', error);
      setError('Authentication failed. Please try again.');
    }
  };

  // Logout function
  const logout = async () => {
    try {
      if (state.token) {
        await authAPI.logout(state.token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear localStorage
      localStorage.removeItem('authToken');
      localStorage.removeItem('authUser');
      localStorage.removeItem('userId');
      
      dispatch({ type: AUTH_ACTIONS.LOGOUT });
    }
  };

  // Set error
  const setError = (error) => {
    dispatch({
      type: AUTH_ACTIONS.SET_ERROR,
      payload: error,
    });
  };

  // Clear error
  const clearError = () => {
    dispatch({ type: AUTH_ACTIONS.CLEAR_ERROR });
  };

  // Update user
  const updateUser = (userData) => {
    const updatedUser = { ...state.user, ...userData };
    localStorage.setItem('authUser', JSON.stringify(updatedUser));
    
    dispatch({
      type: AUTH_ACTIONS.UPDATE_USER,
      payload: userData,
    });
  };

  // API call wrapper with token
  const apiCall = async (apiFunction, ...args) => {
    try {
      if (!state.token) {
        throw new Error('No authentication token available');
      }
      
      return await apiFunction(...args, state.token);
    } catch (error) {
      if (error.message.includes('401') || error.message.includes('Unauthorized')) {
        // Token expired or invalid, logout user
        logout();
      }
      throw error;
    }
  };

  const value = {
    // State
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,
    
    // Actions
    login,
    logout,
    setError,
    clearError,
    updateUser,
    apiCall,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;
