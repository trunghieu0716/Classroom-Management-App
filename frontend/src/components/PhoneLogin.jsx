import React, { useState } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/useAuth';

const PhoneLogin = ({ onNext }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const { setError, clearError, error } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setLoading(true);
    clearError();
    
    try {
      const response = await authAPI.createAccessCode(phoneNumber.trim());
      
      if (response.success) {
        onNext && onNext({ 
          phoneNumber: phoneNumber.trim(),
          sessionId: response.sessionId,
          developmentCode: response.developmentCode // Capture development OTP code
        });
      } else {
        setError(response.message || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Phone login error:', error);
      setError('Failed to send verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{backgroundColor: '#f8f9fa'}}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-6 col-lg-4">
            <div className="card border-0 shadow">
              <div className="card-body p-5">
                {/* Back Button */}
                <div className="mb-4">
                  <button className="btn btn-link text-decoration-none p-0 text-muted d-flex align-items-center">
                    <span className="me-2">←</span>
                    <span>Back</span>
                  </button>
                </div>

                {/* Header */}
                <div className="text-center mb-4">
                  <h2 className="fw-bold mb-3">Sign In</h2>
                  <p className="text-muted">Please enter your phone to sign in</p>
                </div>

                {/* Error Alert */}
                {error && (
                  <div className="alert alert-danger mb-4" role="alert">
                    {error}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <input
                      type="tel"
                      className="form-control form-control-lg"
                      placeholder="Phone number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary btn-lg w-100 mb-4"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="d-flex align-items-center justify-content-center">
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        <span>Sending...</span>
                      </div>
                    ) : (
                      'Send verification code'
                    )}
                  </button>
                </form>

                {/* Footer */}
                <div className="text-center">
                  <p className="text-muted mb-0">
                    Don't have account? <span className="text-primary" style={{cursor: 'pointer'}}>Sign up</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhoneLogin;
