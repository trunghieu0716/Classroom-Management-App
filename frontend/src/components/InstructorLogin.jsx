import React, { useState } from 'react';
import OTPDisplay from './OTPDisplay';
import '../styles/Auth.css';

const InstructorLogin = ({ onAuthenticated, onBack }) => {
  const [step, setStep] = useState('phone'); // 'phone' or 'verification'
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [developmentCode, setDevelopmentCode] = useState('');

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    
    if (!phoneNumber.trim()) {
      setError('Please enter your phone number');
      return;
    }

    setLoading(true);
    clearMessages();
    
    try {
      const response = await fetch('/api/instructor-auth/create-access-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phoneNumber: phoneNumber.trim() }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Verification code sent to your phone!');
        setDevelopmentCode(data.developmentCode || '');
        setStep('verification');
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch (error) {
      console.error('Phone login error:', error);
      setError(`Failed to send verification code: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    
    if (!otpCode.trim()) {
      setError('Please enter the verification code');
      return;
    }

    setLoading(true);
    clearMessages();
    
    try {
      const response = await fetch('/api/instructor-auth/validate-access-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          phoneNumber: phoneNumber.trim(),
          accessCode: otpCode.trim()
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        setSuccess('Login successful!');
        // Đảm bảo user object chứa ID
        if (data.user && !data.user.id) {
          data.user.id = data.user.phoneNumber; // Dùng số điện thoại làm ID nếu không có
        }
        onAuthenticated && onAuthenticated(data);
      } else {
        setError(data.error || 'Invalid verification code');
      }
    } catch (error) {
      console.error('OTP verification error:', error);
      setError(`Failed to verify code: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleUseOTP = (code) => {
    setOtpCode(code);
  };

  const handleBackToPhone = () => {
    setStep('phone');
    setOtpCode('');
    setDevelopmentCode('');
    clearMessages();
  };

  if (step === 'phone') {
    return (
      <div className="container-fluid vh-100 d-flex align-items-center justify-content-center bg-light">
        <div className="row justify-content-center w-100">
          <div className="col-md-6 col-lg-4">
            <div className="card shadow">
              <div className="card-body p-4">
                {/* Header */}
                <div className="text-center mb-4">
                  {onBack && (
                    <button className="btn btn-link float-start p-0" onClick={onBack}>
                      ← Back
                    </button>
                  )}
                  <div className="mb-3">
                    <div className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" 
                         style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                      📱
                    </div>
                  </div>
                  <h3 className="text-primary mb-2">Instructor Login</h3>
                  <p className="text-muted">Enter your phone number to receive verification code</p>
                </div>

                <form onSubmit={handlePhoneSubmit}>
                  <div className="mb-3">
                    <label htmlFor="phoneNumber" className="form-label">Phone Number</label>
                    <input
                      type="tel"
                      className="form-control form-control-lg"
                      id="phoneNumber"
                      placeholder="e.g., +84943554223 or 0943554223"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      disabled={loading}
                    />
                    <small className="text-muted">
                      Enter your registered instructor phone number
                    </small>
                  </div>

                  {/* Error/Success Messages */}
                  {error && (
                    <div className="alert alert-danger" role="alert">
                      {error}
                    </div>
                  )}

                  {success && (
                    <div className="alert alert-success" role="alert">
                      {success}
                    </div>
                  )}

                  <button
                    type="submit"
                    className="btn btn-primary btn-lg w-100 mb-3"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Sending...
                      </>
                    ) : (
                      <>
                        📱 Send Verification Code
                      </>
                    )}
                  </button>

                  <div className="text-center">
                    <small className="text-muted">
                      Only registered instructors can access this system
                    </small>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Verification step
  return (
    <div className="container-fluid vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="row justify-content-center w-100">
        <div className="col-md-6 col-lg-4">
          <div className="card shadow">
            <div className="card-body p-4">
              {/* Header */}
              <div className="text-center mb-4">
                <button className="btn btn-link float-start p-0" onClick={handleBackToPhone}>
                  ← Back
                </button>
                <div className="mb-3">
                  <div className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center" 
                       style={{ width: '60px', height: '60px', fontSize: '1.5rem' }}>
                    🔑
                  </div>
                </div>
                <h3 className="text-success mb-2">Enter Verification Code</h3>
                <p className="text-muted">
                  Code sent to <strong>{phoneNumber}</strong>
                </p>
              </div>

              {/* Development OTP Display */}
              {developmentCode && (
                <OTPDisplay 
                  otpCode={developmentCode}
                  isVisible={true}
                  onUse={handleUseOTP}
                />
              )}

              <form onSubmit={handleOtpSubmit}>
                <div className="mb-3">
                  <label htmlFor="otpCode" className="form-label">Verification Code</label>
                  <input
                    type="text"
                    className="form-control form-control-lg text-center"
                    id="otpCode"
                    placeholder="Enter 6-digit code"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value)}
                    maxLength="6"
                    disabled={loading}
                    style={{ fontSize: '1.5rem', letterSpacing: '0.5rem' }}
                  />
                </div>

                {/* Error/Success Messages */}
                {error && (
                  <div className="alert alert-danger" role="alert">
                    {error}
                  </div>
                )}

                {success && (
                  <div className="alert alert-success" role="alert">
                    {success}
                  </div>
                )}

                <button
                  type="submit"
                  className="btn btn-success btn-lg w-100 mb-3"
                  disabled={loading || !otpCode.trim()}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Verifying...
                    </>
                  ) : (
                    <>
                      ✅ Verify & Login
                    </>
                  )}
                </button>

                <div className="text-center">
                  <small className="text-muted">
                    Didn't receive the code? 
                    <button 
                      type="button" 
                      className="btn btn-link btn-sm p-0 ms-1"
                      onClick={handleBackToPhone}
                    >
                      Resend
                    </button>
                  </small>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InstructorLogin;