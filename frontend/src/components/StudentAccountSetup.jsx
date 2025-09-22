import React, { useState, useEffect } from 'react';
import { studentAuthAPI } from '../services/api';
import '../styles/Auth.css';

const StudentAccountSetup = ({ setupToken, onComplete }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  // Get student information from token
  useEffect(() => {
    const getStudentInfo = async () => {
      try {
        setVerifying(true);
        const response = await studentAuthAPI.verifySetupToken(setupToken);
        
        if (response && response.success) {
          setFormData(prev => ({
            ...prev,
            name: response.student?.name || '',
            email: response.student?.email || ''
          }));
        } else {
          setError(response?.message || 'Failed to verify setup token');
        }
      } catch (error) {
        console.error('Token verification error:', error);
        setError('Error verifying your setup token. Please try again.');
      } finally {
        setVerifying(false);
      }
    };
    
    getStudentInfo();
  }, [setupToken]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear validation error for this field
    if (validationErrors[name]) {
      setValidationErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
    
    // Clear general error when form changes
    if (error) {
      setError('');
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // First validate the form
    if (!validateForm()) {
      return;
    }
    
    setLoading(true);
    setError('');
    
    console.log('⏳ Submitting account setup with token:', setupToken);

    try {
      const response = await studentAuthAPI.setupAccount(
        setupToken,
        formData.name.trim(),
        formData.email,
        formData.password
      );

      if (response && response.success) {
        if (onComplete) {
          onComplete(formData.email);
        }
      } else {
        setError(response?.message || 'Failed to complete account setup');
      }
    } catch (error) {
      console.error('Setup error:', error);
      setError('Network error. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow">
            <div className="card-body p-4">
              <div className="text-center mb-4">
                <div className="display-5 mb-3">🎓</div>
                <h3 className="text-primary">Complete Your Account Setup</h3>
                <p className="text-muted">Set up your student account credentials</p>
              </div>

              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    name="email"
                    value={formData.email}
                    readOnly
                    disabled
                  />
                  <small className="text-muted">Email cannot be changed</small>
                </div>
                
                <div className="mb-3">
                  <label htmlFor="name" className="form-label">Full Name</label>
                  <input
                    type="text"
                    className={`form-control ${validationErrors.name ? 'is-invalid' : ''}`}
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Enter your full name"
                    disabled={loading}
                  />
                  {validationErrors.name && (
                    <div className="invalid-feedback">{validationErrors.name}</div>
                  )}
                </div>

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">Password</label>
                  <input
                    type="password"
                    className={`form-control ${validationErrors.password ? 'is-invalid' : ''}`}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    placeholder="Create a password"
                    disabled={loading}
                  />
                  {validationErrors.password && (
                    <div className="invalid-feedback">{validationErrors.password}</div>
                  )}
                  <small className="text-muted">Password must be at least 6 characters</small>
                </div>

                <div className="mb-4">
                  <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                  <input
                    type="password"
                    className={`form-control ${validationErrors.confirmPassword ? 'is-invalid' : ''}`}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="Confirm your password"
                    disabled={loading}
                  />
                  {validationErrors.confirmPassword && (
                    <div className="invalid-feedback">{validationErrors.confirmPassword}</div>
                  )}
                </div>

                <div className="d-grid">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Setting up account...
                      </>
                    ) : (
                      'Complete Setup'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentAccountSetup;