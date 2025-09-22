import React, { useState, useEffect } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/useAuth';
import OTPHelper from './OTPHelper';
import OTPDisplay from './OTPDisplay';
import { shouldShowOTPHelper } from '../config/development';

const SmsVerification = ({ phoneNumber, sessionId, onNext, onBack, developmentCode }) => {
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [showOTPHelper, setShowOTPHelper] = useState(false);
  const [receivedOTPCode, setReceivedOTPCode] = useState(developmentCode || null);
  const { setError, clearError, error } = useAuth();

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleOTPSelect = (code) => {
    setVerificationCode(code);
    clearError();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!verificationCode.trim()) {
      setError('Please enter verification code');
      return;
    }

    setLoading(true);
    clearError();
    
    try {
      const response = await authAPI.validateAccessCode(phoneNumber, verificationCode.trim());
      
      if (response.success) {
        onNext && onNext({ 
          phoneNumber, 
          verificationCode: verificationCode.trim(),
          sessionId,
          tempToken: response.tempToken 
        });
      } else {
        setError(response.message || 'Invalid verification code');
      }
    } catch (error) {
      console.error('SMS verification error:', error);
      setError('Failed to verify code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setCanResend(false);
    setCountdown(60);
    clearError();
    
    try {
      const response = await authAPI.createAccessCode(phoneNumber);
      
      if (response.success) {
        setError('New verification code sent!');
        // Update sessionId if provided in response
        if (response.sessionId) {
          sessionId = response.sessionId;
        }
        // Capture development OTP code if available
        if (response.developmentCode) {
          setReceivedOTPCode(response.developmentCode);
        }
      } else {
        setError(response.message || 'Failed to resend code');
        setCanResend(true);
        setCountdown(0);
      }
    } catch (error) {
      console.error('Resend SMS error:', error);
      setError('Failed to resend code. Please try again.');
      setCanResend(true);
      setCountdown(0);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
                  <button 
                    className="btn btn-link text-decoration-none p-0 text-muted d-flex align-items-center"
                    onClick={onBack}
                  >
                    <span className="me-2">←</span>
                    <span>Back</span>
                  </button>
                </div>

                {/* Header */}
                <div className="text-center mb-4">
                  <h2 className="fw-bold mb-3">Phone verification</h2>
                  <p className="text-muted">
                    We sent verification code to<br />
                    <strong>{phoneNumber}</strong>
                  </p>
                </div>

                {/* Error/Success Alert */}
                {error && (
                  <div className={`alert ${error.includes('sent') ? 'alert-success' : 'alert-danger'} mb-4`} role="alert">
                    {error}
                  </div>
                )}

                {/* OTP Display for Development */}
                <OTPDisplay 
                  otpCode={receivedOTPCode}
                  isVisible={!!receivedOTPCode}
                  onUse={handleOTPSelect}
                />

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  <div className="mb-4">
                    <input
                      type="text"
                      className="form-control form-control-lg text-center"
                      placeholder="Enter 6-digit code"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      maxLength="6"
                      disabled={loading}
                      style={{ 
                        fontSize: '24px', 
                        letterSpacing: '8px',
                        fontWeight: '600'
                      }}
                    />
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary btn-lg w-100 mb-4"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Verifying...
                      </>
                    ) : (
                      'Verify'
                    )}
                  </button>
                </form>

                {/* Development Helper */}
                {shouldShowOTPHelper() && (
                  <div className="text-center mb-3">
                    <div className="alert alert-warning py-2 mb-2">
                      <small>🛠️ Development Mode - Mock SMS Active</small>
                    </div>
                    <button 
                      type="button"
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => setShowOTPHelper(true)}
                    >
                      🔑 Get OTP Code
                    </button>
                  </div>
                )}

                {/* Resend Section */}
                <div className="text-center">
                  {canResend ? (
                    <button 
                      className="btn btn-link text-decoration-none p-0 text-primary"
                      onClick={handleResend}
                    >
                      Resend code
                    </button>
                  ) : (
                    <p className="text-muted mb-0">
                      Resend code in {formatTime(countdown)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* OTP Helper Modal */}
      <OTPHelper 
        isVisible={showOTPHelper}
        onClose={() => setShowOTPHelper(false)}
        onOTPSelect={handleOTPSelect}
      />
    </div>
  );
};

export default SmsVerification;
