import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import AuthTypeSelection from './AuthTypeSelection';
import InstructorLogin from './InstructorLogin';
import StudentLogin from './StudentLogin';
import StudentAccountSetup from './StudentAccountSetup';

const AuthFlow = () => {
  // Parse URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const setupComplete = urlParams.get('setupComplete');
  const emailFromUrl = urlParams.get('email');
  const setupToken = urlParams.get('token'); // Changed from 'setup' to 'token' to match the URL param
  
  // Log URL parameters for debugging
  useEffect(() => {
    console.log('📌 AuthFlow detected URL params:', {
      setupComplete,
      emailFromUrl,
      setupToken
    });
    
    // Additional checks for URL parameter quality
    if (emailFromUrl) {
      console.log('📧 Email from URL detected:', emailFromUrl);
    }
    
    if (setupComplete === 'true') {
      console.log('✅ Setup completed flag detected');
    }
    
    if (setupToken) {
      console.log('🔑 Setup token detected:', setupToken);
    }
  }, [setupComplete, emailFromUrl, setupToken]);
  
  // Set initial step based on URL parameters - ensure proper casting
  const initialStep = (setupComplete === 'true' && emailFromUrl) ? 'studentLogin' : 'authType';
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [setupEmail, setSetupEmail] = useState(emailFromUrl || '');
  const { login } = useAuth();

  const handleAuthTypeSelection = (type) => {
    console.log('Auth type selected:', type);
    if (type === 'instructor') {
      setCurrentStep('instructorLogin');
    } else {
      setCurrentStep('studentLogin');
    }
    console.log('Current step set to:', type === 'instructor' ? 'instructorLogin' : 'studentLogin');
  };

  const handleInstructorAuth = (data) => {
    console.log('Instructor authentication completed:', data);
    login(data.user, data.token);
  };

  const handleStudentAuth = (data) => {
    console.log('Student authentication completed:', data);
    
    // Ensure data is properly structured
    if (data && data.user && data.token) {
      // Make sure user has required fields
      const userData = {
        ...data.user,
        userType: data.user.userType || 'student',
        id: data.user.id || data.user.email
      };
      
      console.log('Logging in with user data:', userData);
      
      // Call login with force parameter to ensure state update
      login(userData, data.token);
      
      // Additional logging to track the flow
      console.log('🚀 Called login function with:', { userData, token: data.token });
      
      // Force UI update if auth state might be delayed
      setTimeout(() => {
        console.log('Checking auth state after timeout...');
        const storedToken = localStorage.getItem('authToken');
        const storedUser = localStorage.getItem('authUser');
        console.log('Current localStorage state:', { storedToken: !!storedToken, storedUser: !!storedUser });
        
        // If we have token and user in localStorage but still on AuthFlow,
        // force a page reload as last resort
        if (storedToken && storedUser) {
          window.location.href = '/';
        }
      }, 1500);
    } else {
      console.error('Invalid authentication data received:', data);
    }
  };

  const handleStudentSetup = (email) => {
    console.log('Student account setup completed for:', email);
    // Store the email for the login screen
    setSetupEmail(email);
    // Redirect back to student login
    setCurrentStep('studentLogin');
  };

  const handleBack = () => {
    if (currentStep === 'instructorLogin' || currentStep === 'studentLogin') {
      setCurrentStep('authType');
    } else if (currentStep === 'studentSetup') {
      setCurrentStep('studentLogin');
    }
  };
  
  // If we have a setup token in the URL, show the setup page
  if (setupToken && currentStep !== 'studentSetup') {
    console.log('🔄 Showing StudentAccountSetup with token:', setupToken);
    return (
      <StudentAccountSetup 
        setupToken={setupToken}
        onComplete={handleStudentSetup}
      />
    );
  }

  return (
    <>
      {currentStep === 'authType' && (
        <AuthTypeSelection onSelectType={handleAuthTypeSelection} />
      )}
      
      {currentStep === 'instructorLogin' && (
        <InstructorLogin
          onAuthenticated={handleInstructorAuth}
          onBack={handleBack}
        />
      )}
      
      {currentStep === 'studentLogin' && (
        <StudentLogin
          onAuthenticated={handleStudentAuth}
          onBack={handleBack}
          initialEmail={setupEmail || emailFromUrl || ''} // Pass the email from setup or URL
          setupCompleted={setupComplete === 'true'}
        />
      )}
    </>
  );
};

export default AuthFlow;
