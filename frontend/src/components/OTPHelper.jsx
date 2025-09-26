import React, { useState } from 'react';

const OTPHelper = ({ isVisible, onClose, onOTPSelect }) => {
  const [otpCode, setOtpCode] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  // Function to check console for OTP
  const checkConsoleForOTP = () => {
    setIsChecking(true);
    
    // Store original console.log
    const originalLog = console.log;
    
    // Override console.log to capture OTP
    console.log = (...args) => {
      const logString = args.join(' ');
      
      // Look for OTP pattern in console
      const otpMatch = logString.match(/OTP Code:\s*(\d{6})/i);
      if (otpMatch) {
        setOtpCode(otpMatch[1]);
        setIsChecking(false);
      }
      
      // Call original console.log
      originalLog.apply(console, args);
    };
    
    // Restore original console.log after 5 seconds
    setTimeout(() => {
      console.log = originalLog;
      setIsChecking(false);
    }, 5000);
  };

  const handleUseOTP = (code) => {
    if (onOTPSelect) {
      onOTPSelect(code);
    }
    onClose();
  };

  if (!isVisible) return null;

  return (
    <div className="modal fade show" style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">Development Helper</h5>
            <button 
              type="button" 
              className="btn-close" 
              onClick={onClose}
            ></button>
          </div>
          <div className="modal-body">
            <div className="alert alert-info">
              <h6>Mock SMS Active</h6>
              <p>SMS service is in development mode. Check the methods below to get your OTP:</p>
            </div>
            
            <div className="row g-3">
              {/* Method 1: Check Console */}
              <div className="col-12">
                <div className="card border-primary">
                  <div className="card-body">
                    <h6 className="card-title">Method 1: Browser Console</h6>
                    <p className="small text-muted">Open browser console (F12) and look for the OTP code</p>
                    <button 
                      className="btn btn-outline-primary btn-sm"
                      onClick={() => window.open('', '_blank')}
                    >
                      How to open console
                    </button>
                  </div>
                </div>
              </div>

              {/* Method 2: Backend Console */}
              <div className="col-12">
                <div className="card border-success">
                  <div className="card-body">
                    <h6 className="card-title">Method 2: Backend Console</h6>
                    <p className="small text-muted">Check your backend terminal/console for the OTP code</p>
                    <div className="bg-dark text-light p-2 rounded small font-monospace">
                      MOCK SMS SENT:<br />
                      To: +84932583717<br />
                      OTP Code: <span className="text-warning">123456</span><br />
                      Expires in: 5 minutes
                    </div>
                  </div>
                </div>
              </div>

              {/* Method 3: Manual Input */}
              <div className="col-12">
                <div className="card border-warning">
                  <div className="card-body">
                    <h6 className="card-title">Method 3: Quick Test</h6>
                    <p className="small text-muted">Use these test codes for development:</p>
                    <div className="d-flex gap-2 flex-wrap">
                      {['123456', '111111', '000000'].map(code => (
                        <button
                          key={code}
                          className="btn btn-outline-warning btn-sm"
                          onClick={() => handleUseOTP(code)}
                        >
                          Use {code}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {otpCode && (
              <div className="alert alert-success mt-3">
                <h6>🎉 OTP Detected!</h6>
                <div className="d-flex justify-content-between align-items-center">
                  <span className="font-monospace fs-5">{otpCode}</span>
                  <div className="btn-group">
                    <button 
                      className="btn btn-success btn-sm"
                      onClick={() => handleUseOTP(otpCode)}
                    >
                      Use Code
                    </button>
                    <button 
                      className="btn btn-outline-success btn-sm"
                      onClick={() => {
                        navigator.clipboard.writeText(otpCode);
                        alert('OTP copied to clipboard!');
                      }}
                    >
                      Copy
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button 
              type="button" 
              className="btn btn-primary"
              onClick={checkConsoleForOTP}
              disabled={isChecking}
            >
              {isChecking ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2"></span>
                  Checking...
                </>
              ) : (
                'Auto-detect OTP'
              )}
            </button>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPHelper;