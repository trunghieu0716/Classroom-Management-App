import React, { useState, useEffect } from 'react';
import StudentAccountSetup from './StudentAccountSetup';


const StudentSetupPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tokenValid, setTokenValid] = useState(false);
  const [setupToken, setSetupToken] = useState('');
  const [studentEmail, setStudentEmail] = useState('');

  useEffect(() => {
    const validateToken = async () => {
      try {
        // Parse token from URL query parameter
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const email = params.get('email');
        
        console.log('🔍 Validating token with params:', { token, email });
        
        if (!token) {
          setError('Missing setup token. Please use the link from your invitation email.');
          setLoading(false);
          return;
        }

        setSetupToken(token);
        if (email) {
          setStudentEmail(email);
          // If we have both token and email, proceed directly
          // This simplifies the flow for users
          setTokenValid(true);
          setLoading(false);
          return;
        }
        
        try {
          // Try to decode email from token using built-in browser functions
          const tokenData = atob(token);
          const [tokenEmail] = tokenData.split(':');
          
          if (tokenEmail && tokenEmail.includes('@')) {
            setStudentEmail(tokenEmail);
            setTokenValid(true);
            console.log('✅ Email extracted from token:', tokenEmail);
          } else {
            setError('Invalid token format. Please request a new setup link.');
          }
        } catch (e) {
          console.error('Failed to decode token:', e);
          setError('Error decoding setup token. Please try again with a valid setup link.');
        }
      } catch (error) {
        console.error('Token validation error:', error);
        setError('Error validating your setup link. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    validateToken();
  }, []);

  const handleSetupComplete = (email) => {
    // Redirect to main page with success parameter
    const finalEmail = email || studentEmail;
    console.log('✅ Setup completed, redirecting to login with email:', finalEmail);
    
    // Add a short delay to allow state updates to complete
    setTimeout(() => {
      // Ensure URL params are properly formatted and encoded
      const redirectUrl = `/?setupComplete=true&email=${encodeURIComponent(finalEmail)}`;
      console.log('🔄 Redirecting to:', redirectUrl);
      
      // Use pushState if possible to prevent navigation issues
      try {
        window.history.pushState({}, '', redirectUrl);
        window.location.reload();
      } catch (error) {
        // Fall back to assign if pushState fails
        console.log('❌ PushState failed:', error);
        window.location.assign(redirectUrl);
      }
    }, 1500); // Increased delay for reliability
  };

  if (loading) {
    return (
      <div className="container mt-5 text-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Validating your setup link...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mt-5">
        <div className="card shadow">
          <div className="card-body text-center p-5">
            <div className="mb-4 text-danger">
              <i className="bi bi-exclamation-circle" style={{ fontSize: '3rem' }}></i>
            </div>
            <h3>Setup Link Error</h3>
            <p className="text-muted">{error}</p>
            <button 
              className="btn btn-primary mt-3"
              onClick={() => window.location.href = '/'}
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (tokenValid) {
    return (
      <StudentAccountSetup setupToken={setupToken} onComplete={handleSetupComplete} />
    );
  }

  // Fallback - should not reach here
  return (
    <div className="container mt-5 text-center">
      <p>Something went wrong. Please try again later.</p>
      <button 
        className="btn btn-primary"
        onClick={() => window.location.href = '/'}
      >
        Go to Login
      </button>
    </div>
  );
};

export default StudentSetupPage;