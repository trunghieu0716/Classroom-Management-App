import React from 'react';

const OTPDisplay = ({ otpCode, isVisible, onUse }) => {
  if (!isVisible || !otpCode) return null;

  return (
    <div className="alert alert-success border border-success" style={{ 
      position: 'relative',
      marginBottom: '1rem',
      backgroundColor: '#d4edda'
    }}>
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <h6 className="mb-1">🔑 Development OTP Code</h6>
          <div className="d-flex align-items-center gap-2">
            <span className="font-monospace fs-4 fw-bold text-success">{otpCode}</span>
            <small className="text-muted">(Mock SMS)</small>
          </div>
        </div>
        <div className="d-flex gap-2">
          <button 
            className="btn btn-success btn-sm"
            onClick={() => onUse && onUse(otpCode)}
            title="Auto-fill code"
          >
            ✅ Use
          </button>
          <button 
            className="btn btn-outline-success btn-sm"
            onClick={() => {
              navigator.clipboard.writeText(otpCode);
              alert('OTP copied!');
            }}
            title="Copy to clipboard"
          >
            📋
          </button>
        </div>
      </div>
    </div>
  );
};

export default OTPDisplay;