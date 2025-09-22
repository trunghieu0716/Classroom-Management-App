import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { studentAPI } from '../services/api';
import SimpleChatContainer from './SimpleChatContainer';

const StudentDashboard = ({ user }) => {
  const { token, logout, setError } = useAuth();
  const [activeTab, setActiveTab] = useState('lessons');
  const [profile, setProfile] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phoneNumber || ''
  });
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load lessons on component mount
  useEffect(() => {
    const loadLessons = async () => {
      try {
        setLoading(true);
        
        if (token && profile.phone) {
          // Fetch lessons from API
          const response = await studentAPI.getMyLessons(token);
          
          if (response && response.lessons) {
            // Transform API data to match our component's format
            const formattedLessons = response.lessons.map(lesson => ({
              id: lesson.id,
              title: lesson.title,
              description: lesson.description,
              content: lesson.description, // Using description as content since API doesn't have content field
              assignedDate: lesson.assignedAt?.toDate?.() || lesson.assignedAt,
              completed: lesson.isCompleted,
              completedDate: lesson.completedAt?.toDate?.() || lesson.completedAt
            }));
            
            setLessons(formattedLessons);
          } else {
            console.log('No lessons found or invalid response format');
            setLessons([]);
          }
        } else {
          console.log('No token or phone available, using mock data');
          // Mock data as fallback
          const mockLessons = [
            {
              id: 1,
              title: "Introduction to React",
              description: "Learn the basics of React components",
              content: "React is a JavaScript library for building user interfaces...",
              assignedDate: "2024-01-15",
              completed: false
            },
            {
              id: 2,
              title: "State Management",
              description: "Understanding useState and state updates",
              content: "State allows React components to change their output over time...",
              assignedDate: "2024-01-20",
              completed: true,
              completedDate: "2024-01-25"
            }
          ];
          
          setLessons(mockLessons);
        }
      } catch (error) {
        console.error('Load lessons error:', error);
        setError('Failed to load lessons. Please try again later.');
        setLessons([]);
      } finally {
        setLoading(false);
      }
    };

    loadLessons();
  }, [token, profile.phone, setError]);

  const tabs = [
    { id: 'lessons', label: 'My Lessons', icon: '📚' },
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'messages', label: 'Messages', icon: '💬' }
  ];

  const completedCount = lessons.filter(l => l.completed).length;
  const progressPercentage = lessons.length > 0 ? (completedCount / lessons.length) * 100 : 0;

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-success">
        <div className="container">
          <span className="navbar-brand mb-0 h1">🎓 Student Portal</span>
          <div className="navbar-nav ms-auto">
            <div className="nav-item dropdown">
              <a className="nav-link dropdown-toggle text-white" href="#" role="button" data-bs-toggle="dropdown">
                👨‍🎓 {profile.name}
              </a>
              <ul className="dropdown-menu">
                <li><button className="dropdown-item" onClick={logout}>Logout</button></li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      {/* Stats Cards */}
      <div className="container mt-4">
        <div className="row g-3 mb-4">
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="h2 text-primary mb-2">📚</div>
                <h4 className="fw-bold">{lessons.length}</h4>
                <small className="text-muted">Total Lessons</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="h2 text-success mb-2">✅</div>
                <h4 className="fw-bold">{completedCount}</h4>
                <small className="text-muted">Completed</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="h2 text-warning mb-2">📊</div>
                <h4 className="fw-bold">{Math.round(progressPercentage)}%</h4>
                <small className="text-muted">Progress</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="h2 text-info mb-2">💬</div>
                <h4 className="fw-bold" id="unread-message-count">0</h4>
                <small className="text-muted">New Messages</small>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <ul className="nav nav-pills mb-4">
          {tabs.map((tab) => (
            <li key={tab.id} className="nav-item">
              <button
                className={`nav-link ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="me-2">{tab.icon}</span>
                {tab.label}
              </button>
            </li>
          ))}
        </ul>

        {/* Content Area */}
        <div className="card border-0 shadow-sm">
          <div className="card-body">
            {activeTab === 'lessons' && (
              <LessonsView lessons={lessons} setLessons={setLessons} setError={setError} />
            )}
            {activeTab === 'profile' && (
              <ProfileEdit profile={profile} setProfile={setProfile} setError={setError} />
            )}
            {activeTab === 'messages' && (
              <SimpleChatContainer userType="student" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Lessons View Component
const LessonsView = ({ lessons, setLessons, setError }) => {
  const { token } = useAuth();
  const [selectedLesson, setSelectedLesson] = useState(null);
  const [filter, setFilter] = useState('all');
  const [submitting, setSubmitting] = useState(false);

  const filteredLessons = lessons.filter(lesson => {
    if (filter === 'completed') return lesson.completed;
    if (filter === 'pending') return !lesson.completed;
    return true;
  });

  const markAsCompleted = async (lessonId) => {
    try {
      setSubmitting(true);
      
      // Get user info from Auth context
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (!token || !user?.phoneNumber) {
        throw new Error('Authentication required');
      }
      
      // Call the API
      const response = await studentAPI.markLessonDone(
        { phone: user.phoneNumber, lessonId }, 
        token
      );
      
      if (response && response.success) {
        // Update local state with the completed lesson
        setLessons(prev => prev.map(lesson => 
          lesson.id === lessonId 
            ? { ...lesson, completed: true, completedDate: new Date() }
            : lesson
        ));
        
        // Close the modal if it's open
        setSelectedLesson(null);
        
        // Show success message (optional)
        // You could use a toast notification here if you have one
        console.log('Lesson marked as completed successfully');
      } else {
        throw new Error(response?.message || 'Failed to mark lesson as done');
      }
    } catch (error) {
      console.error('Mark lesson done error:', error);
      setError(error.message || 'Failed to mark lesson as done. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">📚 My Lessons</h4>
        <div className="btn-group">
          <button 
            className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button 
            className={`btn btn-sm ${filter === 'pending' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setFilter('pending')}
          >
            Pending
          </button>
          <button 
            className={`btn btn-sm ${filter === 'completed' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setFilter('completed')}
          >
            Completed
          </button>
        </div>
      </div>

      <div className="row g-3">
        {filteredLessons.map((lesson) => (
          <div key={lesson.id} className="col-md-6">
            <div className={`card h-100 ${lesson.completed ? 'border-success' : 'border-warning'}`}>
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-3">
                  <h5 className="card-title">{lesson.title}</h5>
                  {lesson.completed ? (
                    <span className="badge bg-success">✅ Completed</span>
                  ) : (
                    <span className="badge bg-warning">⏳ Pending</span>
                  )}
                </div>
                <p className="card-text text-muted">{lesson.description}</p>
                <div className="small text-muted mb-3">
                  <div>📅 Assigned: {new Date(lesson.assignedDate).toLocaleDateString()}</div>
                  {lesson.completedDate && (
                    <div>✅ Completed: {new Date(lesson.completedDate).toLocaleDateString()}</div>
                  )}
                </div>
              </div>
              <div className="card-footer bg-transparent">
                <button 
                  className="btn btn-sm btn-outline-primary me-2"
                  onClick={() => setSelectedLesson(lesson)}
                >
                  View Details
                </button>
                {!lesson.completed && (
                  <button 
                    className="btn btn-sm btn-success"
                    onClick={() => markAsCompleted(lesson.id)}
                  >
                    Mark as Done
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Lesson Detail Modal */}
      {selectedLesson && (
        <div className="modal d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{selectedLesson.title}</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setSelectedLesson(null)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <h6>Description</h6>
                  <p className="text-muted">{selectedLesson.description}</p>
                </div>
                <div className="mb-3">
                  <h6>Content</h6>
                  <p>{selectedLesson.content}</p>
                </div>
                <div className="row">
                  <div className="col-6">
                    <strong>Assigned Date:</strong>
                    <br />
                    {new Date(selectedLesson.assignedDate).toLocaleDateString()}
                  </div>
                  {selectedLesson.completedDate && (
                    <div className="col-6">
                      <strong>Completed Date:</strong>
                      <br />
                      {new Date(selectedLesson.completedDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => setSelectedLesson(null)}
                >
                  Close
                </button>
                {!selectedLesson.completed && (
                  <button 
                    type="button" 
                    className="btn btn-success"
                    onClick={() => markAsCompleted(selectedLesson.id)}
                  >
                    Mark as Done
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Profile Edit Component
const ProfileEdit = ({ profile, setProfile, setError }) => {
  const { token } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState(profile);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Validate form before submission
  const validateForm = () => {
    const errors = {};
    
    if (!editForm.name.trim()) {
      errors.name = 'Name is required';
    }
    
    if (!editForm.email.trim()) {
      errors.email = 'Email is required';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(editForm.email)) {
        errors.email = 'Invalid email format';
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (e) => {
    e.preventDefault();
    
    // First validate the form
    if (!validateForm()) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Get user info from localStorage
      const user = JSON.parse(localStorage.getItem('user'));
      
      if (!token || !user?.phoneNumber) {
        throw new Error('Authentication required');
      }
      
      // Call the API to update profile
      const response = await studentAPI.editProfile(
        {
          phone: user.phoneNumber,
          name: editForm.name.trim(),
          email: editForm.email.trim()
        },
        token
      );
      
      if (response && response.success) {
        // Update local state with the new profile data
        setProfile(editForm);
        setIsEditing(false);
        
        // Update user in localStorage if needed
        if (user) {
          const updatedUser = {
            ...user,
            name: editForm.name.trim(),
            email: editForm.email.trim()
          };
          localStorage.setItem('user', JSON.stringify(updatedUser));
        }
        
        // Optional: Show success message
        console.log('Profile updated successfully');
      } else {
        throw new Error(response?.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Update profile error:', error);
      setError(error.message || 'Failed to update profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditForm(profile);
    setIsEditing(false);
  };

  return (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">👤 My Profile</h4>
        {!isEditing ? (
          <button 
            className="btn btn-primary"
            onClick={() => setIsEditing(true)}
          >
            Edit Profile
          </button>
        ) : (
          <div>
            <button 
              className="btn btn-secondary me-2"
              onClick={handleCancel}
            >
              Cancel
            </button>
            <button 
              className="btn btn-success"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </div>
        )}
      </div>

      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="card">
            <div className="card-body">
              <div className="text-center mb-4">
                <div className="bg-success text-white rounded-circle d-inline-flex align-items-center justify-content-center" 
                     style={{ width: '80px', height: '80px', fontSize: '2rem' }}>
                  👨‍🎓
                </div>
                <h5 className="mt-3">{profile.name}</h5>
                <p className="text-muted">Student</p>
              </div>

              {isEditing ? (
                <form onSubmit={handleSave}>
                  <div className="row g-3">
                    <div className="col-12">
                      <label className="form-label">Full Name</label>
                      <input
                        type="text"
                        className={`form-control ${validationErrors.name ? 'is-invalid' : ''}`}
                        value={editForm.name}
                        onChange={(e) => {
                          setEditForm(prev => ({...prev, name: e.target.value}));
                          // Clear validation error when field is edited
                          if (validationErrors.name) {
                            setValidationErrors(prev => ({...prev, name: null}));
                          }
                        }}
                        required
                      />
                      {validationErrors.name && (
                        <div className="invalid-feedback">{validationErrors.name}</div>
                      )}
                    </div>
                    <div className="col-12">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className={`form-control ${validationErrors.email ? 'is-invalid' : ''}`}
                        value={editForm.email}
                        onChange={(e) => {
                          setEditForm(prev => ({...prev, email: e.target.value}));
                          // Clear validation error when field is edited
                          if (validationErrors.email) {
                            setValidationErrors(prev => ({...prev, email: null}));
                          }
                        }}
                        required
                      />
                      {validationErrors.email && (
                        <div className="invalid-feedback">{validationErrors.email}</div>
                      )}
                    </div>
                    <div className="col-12">
                      <label className="form-label">Phone Number</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={editForm.phone}
                        disabled
                        title="Phone number cannot be changed"
                      />
                      <small className="text-muted">Phone number cannot be changed</small>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label">Full Name</label>
                    <div className="form-control-plaintext border-bottom">{profile.name}</div>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Email</label>
                    <div className="form-control-plaintext border-bottom">{profile.email}</div>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Phone Number</label>
                    <div className="form-control-plaintext border-bottom">{profile.phone}</div>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Role</label>
                    <div className="form-control-plaintext border-bottom">
                      <span className="badge bg-success">👨‍🎓 Student</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
