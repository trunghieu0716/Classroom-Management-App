import React from 'react';

const AuthTypeSelection = ({ onSelectType }) => {
  return (
    <div className="container-fluid vh-100 d-flex align-items-center justify-content-center bg-light">
      <div className="row justify-content-center w-100">
        <div className="col-md-8 col-lg-6">
          <div className="card border-0 shadow-lg">
            <div className="card-body p-5">
              {/* Header */}
              <div className="text-center mb-5">
                <h2 className="fw-bold text-primary mb-2">🎓 Classroom Manager</h2>
                <p className="text-muted">Choose your login method</p>
              </div>

              {/* Login Type Selection */}
              <div className="row g-4">
                {/* Instructor Login */}
                <div className="col-md-6">
                  <div 
                    className="card h-100 text-center border-primary position-relative"
                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                    onClick={() => onSelectType('instructor')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0,123,255,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    <div className="card-body p-4">
                      <div className="mb-3">
                        <div 
                          className="bg-primary text-white rounded-circle d-inline-flex align-items-center justify-content-center" 
                          style={{ width: '80px', height: '80px', fontSize: '2.5rem' }}
                        >
                          👨‍🏫
                        </div>
                      </div>
                      <h4 className="fw-bold text-primary mb-3">Instructor</h4>
                      <p className="text-muted mb-3">
                        Manage students, create lessons, and track progress
                      </p>
                      <div className="small text-muted">
                        <i className="bi bi-phone me-2"></i>
                        Login with Phone Number
                      </div>
                    </div>
                  </div>
                </div>

                {/* Student Login */}
                <div className="col-md-6">
                  <div 
                    className="card h-100 text-center border-success position-relative"
                    style={{ cursor: 'pointer', transition: 'all 0.3s ease' }}
                    onClick={() => onSelectType('student')}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = 'translateY(-5px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(40,167,69,0.3)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '';
                    }}
                  >
                    <div className="card-body p-4">
                      <div className="mb-3">
                        <div 
                          className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center" 
                          style={{ width: '80px', height: '80px', fontSize: '2.5rem' }}
                        >
                          👨‍🎓
                        </div>
                      </div>
                      <h4 className="fw-bold text-success mb-3">Student</h4>
                      <p className="text-muted mb-3">
                        View lessons, complete assignments, and chat with instructors
                      </p>
                      <div className="small text-muted">
                        <i className="bi bi-envelope me-2"></i>
                        Login with Email Address
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Footer Info */}
              <div className="text-center mt-4">
                <small className="text-muted">
                  New student? Your instructor will send you an invitation email to set up your account.
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AuthTypeSelection;