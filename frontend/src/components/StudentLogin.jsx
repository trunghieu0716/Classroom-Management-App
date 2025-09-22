import React, { useState, useEffect, useRef, useCallback } from 'react';
import OTPDisplay from './OTPDisplay';
import { studentAuthAPI } from '../services/api';
import '../styles/Auth.css';

const StudentLogin = ({ onAuthenticated, onBack, initialEmail = '', setupCompleted = false }) => {
  const [step, setStep] = useState('email'); // 'email' or 'verification'
  const [email, setEmail] = useState(initialEmail);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(setupCompleted ? 'Account setup completed successfully! Please login with your email.' : '');
  const [developmentCode, setDevelopmentCode] = useState('');
  const [key, setKey] = useState(Date.now()); // Force re-render key
  
  // References to track component state
  const isMounted = useRef(true);
  const hasAutoSubmitted = useRef(false);
  
  // Enhanced debugging for component lifecycle
  console.log('StudentLogin rendered with step:', step, 'key:', key, 'initialEmail:', initialEmail, 'setupCompleted:', setupCompleted);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false;
    };
  }, []);
  
  // Direct navigation function that forces re-render
  const navigateToStep = useCallback((newStep) => {
    console.log(`🔄 DIRECT NAVIGATION to step: ${newStep}`);
    setStep(newStep);
    setKey(Date.now()); // Change key to force full re-render
  }, []);
  
  // Helper function to clear messages
  const clearMessages = useCallback(() => {
    setError('');
    setSuccess('');
  }, []);
  
  // Add effect to log step changes
  useEffect(() => {
    console.log('Step state changed to:', step);
    
    // Force a re-render when step changes
    const forceUpdate = setTimeout(() => {
      console.log('Forced re-render after step change to:', step);
      // This empty setState forces a re-render
      if (isMounted.current) {
        setLoading(l => l);
      }
    }, 10);
    
    return () => clearTimeout(forceUpdate);
  }, [step]);
  
  const handleEmailSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    clearMessages();
    
    try {
      console.log('Sending request to create access code...');
      
      const data = await studentAuthAPI.createAccessCode(email.trim());
      console.log('Response received:', data);
      
      // Handle setup required case
      if (data.needsSetup) {
        console.log('Account setup required, redirecting...');
        // Use full URL path to avoid relative URL issues
        const setupUrl = `/student-setup?token=${data.setupToken}&email=${encodeURIComponent(data.email)}`;
        console.log('Redirecting to:', setupUrl);
        // Use window.location.assign for safer redirects that won't reload the entire app
        window.location.assign(setupUrl);
        return;
      }
      
      if (data.success) {
        console.log('Verification code sent successfully');
        
        // Important: Set all states together to avoid render issues
        // Set success message and development code first
        setSuccess('Verification code sent to your email!');
        setDevelopmentCode(data.developmentCode || '');
        
        // CRITICAL FIX: Use direct navigation function
        // This ensures a complete component re-render
        console.log('Using direct navigation to verification step...');
        navigateToStep('verification');
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Email login error:', error);
      
      // Check if the error message indicates setup not completed
      if (error.message && error.message.includes('setup')) {
        setError('Account setup not completed. Please check your email for setup instructions.');
      } else {
        setError(`Failed to send verification code: ${error.message}`);
      }
    } finally {
      setLoading(false);
    }
  }, [email, clearMessages, navigateToStep]);

  // Automatically send verification code if we have an email from account setup
  useEffect(() => {
    console.log('Auto-submit effect running, checking conditions:', {
      initialEmail,
      setupCompleted,
      currentStep: step,
      hasAutoSubmitted: hasAutoSubmitted.current
    });
    
    // Make sure email is set correctly first - separate this from the submission logic
    if (initialEmail && initialEmail !== email) {
      console.log('📧 Setting email from props:', initialEmail);
      setEmail(initialEmail);
    }
    
    // Now handle auto-submission with proper conditions
    if (initialEmail && setupCompleted && step === 'email' && !hasAutoSubmitted.current) {
      console.log('🔄 Auto-submitting email from account setup:', initialEmail);
      hasAutoSubmitted.current = true; // Mark as run to prevent multiple executions
      
      // Only trigger this once when component mounts, with a longer delay
      const timer = setTimeout(() => {
        if (isMounted.current) {
          console.log('🚀 Auto-submitting login form for:', initialEmail);
          // Create a synthetic event for preventDefault
          const syntheticEvent = { preventDefault: () => {} };
          handleEmailSubmit(syntheticEvent);
        }
      }, 2500); // Increased delay to ensure UI is fully rendered and state is updated
      
      // Clean up timeout if component unmounts
      return () => clearTimeout(timer);
    }
  }, [initialEmail, setupCompleted, step, handleEmailSubmit, email]);

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    
    if (!otpCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    clearMessages();
    
    try {
      console.log('Sending request to validate access code...');
      
      const data = await studentAuthAPI.validateAccessCode(
        email.trim(),
        otpCode.trim()
      );
      
      console.log('Response received from validation:', data);
      
      // Enhanced validation checks
      if (!data.token) {
        console.error('Missing token in successful response:', data);
        throw new Error('Authentication failed: Server did not provide an authentication token');
      }
      
      if (data.success) {
        setSuccess('Verification successful!');
        console.log('User authenticated with token:', data.token);
        console.log('User data received:', data.user);
        
        // Save the token to localStorage
        localStorage.setItem('authToken', data.token);
        localStorage.setItem('userType', 'student');
        
        // Also store the user object in localStorage for persistence
        const userData = data.user || {
          email: email.trim(),
          userType: 'student',
          name: data.user?.name || '',
          id: data.user?.id || email.trim()
        };
        localStorage.setItem('authUser', JSON.stringify(userData));
        
        // Display success message briefly before proceeding
        // Call onAuthenticated immediately to avoid timing issues
        if (onAuthenticated) {
          // Log the authentication process
          console.log('🔐 Authentication successful, transitioning to dashboard...');
          
          // Call onAuthenticated function with proper structure immediately
          onAuthenticated({
            user: userData,
            token: data.token
          });
        }
        
        // Force navigation to dashboard as a fallback
        setTimeout(() => {
          if (isMounted.current) {
            console.log('⏱️ Timeout reached - forcing navigation to dashboard');
            
            // Force state update in context if available
            if (onAuthenticated) {
              onAuthenticated({
                user: userData,
                token: data.token
              });
            }
            
            // Direct navigation fallback
            window.location.href = '/';
          }
        }, 2000); // Longer delay to allow normal flow to complete first
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError(`Verification failed: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'email') setEmail(value);
    if (name === 'otpCode') setOtpCode(value);
    
    // Clear errors when user types
    if (error) setError('');
  };

  const handleEmailKeyDown = (e) => {
    // Submit form on Enter key
    if (e.key === 'Enter' && !loading) {
      e.preventDefault();
      handleEmailSubmit(e);
    }
  };

  const handleOtpKeyDown = (e) => {
    // Submit form on Enter key
    if (e.key === 'Enter' && !loading) {
      e.preventDefault();
      handleOtpSubmit(e);
    }
  };

  const handleBackToEmail = (e) => {
    e.preventDefault();
    // Clear any previous messages
    clearMessages();
    setOtpCode('');
    setDevelopmentCode('');
    navigateToStep('email');
  };

  // RENDER LOGIC - Ensures consistent rendering with key-based approach
  return (
    <div className="auth-container" key={key}>
      <div className="auth-form">
        <h2>Student Login</h2>
        
        {error && <div className="error-message">{error}</div>}
        {success && <div className="success-message">{success}</div>}
        
        {step === 'email' ? (
          <form onSubmit={handleEmailSubmit}>
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={email}
                onChange={handleChange}
                onKeyDown={handleEmailKeyDown}
                placeholder="Enter your email"
                autoComplete="email"
                required
                disabled={loading}
              />
            </div>
            
            <div className="form-buttons">
              <button type="button" onClick={onBack} disabled={loading}>
                Back
              </button>
              <button type="submit" disabled={loading}>
                {loading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit}>
            <div className="form-group">
              <label htmlFor="otpCode">Verification Code</label>
              <input
                type="text"
                id="otpCode"
                name="otpCode"
                value={otpCode}
                onChange={handleChange}
                onKeyDown={handleOtpKeyDown}
                placeholder="Enter verification code"
                autoComplete="one-time-code"
                required
                disabled={loading}
                autoFocus
              />
              
              {developmentCode && (
                <OTPDisplay code={developmentCode} email={email} />
              )}
            </div>
            
            <div className="form-buttons">
              <button
                type="button"
                onClick={handleBackToEmail}
                disabled={loading}
              >
                Back
              </button>
              <button type="submit" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default StudentLogin;