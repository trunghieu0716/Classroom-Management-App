import React, { useState } from 'react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/useAuth';

const RoleSelection = ({ phoneNumber, onComplete, onBack }) => {
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const { setError, clearError, error } = useAuth();

  const roles = [
    {
      id: 'instructor',
      title: 'Instructor',
      description: 'Manage students, create lessons, and track progress',
      icon: '👨‍🏫'
    },
    {
      id: 'student',
      title: 'Student', 
      description: 'Join classes, view lessons, and chat with instructors',
      icon: '👨‍🎓'
    }
  ];

  // const handleSubmit = async (e) => {
  //   e.preventDefault();
    
  //   if (!selectedRole) {
  //     setError('Please select your role');
  //     return;
  //   }

  //   setLoading(true);
  //   clearError();
    
  //   try {
  //     const response = await authAPI.setUserType(tempToken, selectedRole);
      
  //     if (response.success) {
  //       onComplete && onComplete({ 
  //         role: selectedRole,
  //         user: response.user,
  //         token: response.token
  //       });
  //     } else {
  //       setError(response.message || 'Failed to set user type');
  //     }
  //   } catch (error) {
  //     console.error('Role selection error:', error);
  //     setError('Failed to complete registration. Please try again.');
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleSubmit = async (e) => {
  e.preventDefault();
  if (!selectedRole) {
    setError('Please select a role');
    return;
  }

  setLoading(true);
  clearError();

  try {
    // Gọi API với phoneNumber thay vì tempToken
    const result = await authAPI.setUserType(phoneNumber, selectedRole);
    
    console.log('✅ User type set:', result);
    onComplete(result);
  } catch (error) {
    console.error('❌ Set user type error:', error);
    setError('Failed to complete registration. Please try again.');
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-vh-100 d-flex align-items-center justify-content-center" style={{backgroundColor: '#f8f9fa'}}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-12 col-md-8 col-lg-6">
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
                <div className="text-center mb-5">
                  <h2 className="fw-bold mb-3">Select Role</h2>
                  <p className="text-muted">How would you like to use the app?</p>
                </div>

                {/* Error Alert */}
                {error && (
                  <div className="alert alert-danger mb-4" role="alert">
                    {error}
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit}>
                  <div className="row g-3 mb-5">
                    {roles.map((role) => (
                      <div key={role.id} className="col-12">
                        <div 
                          className={`card h-100 cursor-pointer border-2 ${
                            selectedRole === role.id 
                              ? 'border-primary bg-primary bg-opacity-10' 
                              : 'border-light'
                          }`}
                          onClick={() => setSelectedRole(role.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <div className="card-body p-4">
                            <div className="d-flex align-items-center">
                              <div className="form-check me-3">
                                <input
                                  className="form-check-input"
                                  type="radio"
                                  name="role"
                                  id={role.id}
                                  value={role.id}
                                  checked={selectedRole === role.id}
                                  onChange={() => setSelectedRole(role.id)}
                                />
                              </div>
                              <div className="me-3" style={{ fontSize: '2rem' }}>
                                {role.icon}
                              </div>
                              <div className="flex-grow-1">
                                <h5 className="card-title mb-2 fw-bold">{role.title}</h5>
                                <p className="card-text text-muted mb-0">{role.description}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <button 
                    type="submit" 
                    className="btn btn-primary btn-lg w-100"
                    disabled={loading || !selectedRole}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Setting up...
                      </>
                    ) : (
                      'Continue'
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelection;
