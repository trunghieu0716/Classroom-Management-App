import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/useAuth';
import { instructorAPI } from '../services/api';
import SimpleChatContainer from './SimpleChatContainer';

const InstructorDashboard = ({ user }) => {
  const { logout, token } = useAuth();
  const [activeTab, setActiveTab] = useState('students');
  const [students, setStudents] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);

  // Save instructor ID to localStorage when user is available
  useEffect(() => {
    if (user) {
      const userId = user.id || user.phoneNumber;
      console.log('Setting userId in localStorage:', userId);
      localStorage.setItem('userId', userId);
    }
  }, [user]);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const response = await instructorAPI.getStudents(token);
        if (response && response.students) {
          setStudents(response.students || []);
        } else {
          console.warn('No students found:', response);
          setStudents([]); // Set empty array instead of error
        }
      } catch (error) {
        console.error('Load students error:', error);
        // Don't show error to user, just set empty students
        setStudents([]);
      } finally {
        setLoading(false);
      }
    };
    
    if (token) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [token]);

  const loadStudents = async () => {
    try {
      const response = await instructorAPI.getStudents(token);
      if (response && response.students) {
        setStudents(response.students || []);
      } else {
        console.warn('No students found:', response);
        setStudents([]);
      }
    } catch (error) {
      console.error('Load students error:', error);
      setStudents([]);
    }
  };

  const tabs = [
    { id: 'students', label: 'Manage Students', icon: '👥' },
    { id: 'lessons', label: 'Lessons', icon: '📚' },
    { id: 'messages', label: 'Messages', icon: '💬' }
  ];

  return (
    <div className="min-vh-100 bg-light">
      {/* Header */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <span className="navbar-brand mb-0 h1">📚 Classroom Manager</span>
          <div className="navbar-nav ms-auto">
            <div className="nav-item dropdown">
              <a className="nav-link dropdown-toggle text-white" href="#" role="button" data-bs-toggle="dropdown">
                👨‍🏫 {user?.phoneNumber}
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
                <div className="h2 text-primary mb-2">👥</div>
                <h4 className="fw-bold">{students.length}</h4>
                <small className="text-muted">Total Students</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="h2 text-success mb-2">📚</div>
                <h4 className="fw-bold">{lessons.length}</h4>
                <small className="text-muted">Total Lessons</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="h2 text-warning mb-2">✅</div>
                <h4 className="fw-bold">{lessons.reduce((sum, l) => sum + l.completed, 0)}</h4>
                <small className="text-muted">Completed Tasks</small>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card border-0 shadow-sm">
              <div className="card-body text-center">
                <div className="h2 text-info mb-2">💬</div>
                <h4 className="fw-bold">5</h4>
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
            {activeTab === 'students' && (
              <StudentManagement students={students} setStudents={setStudents} onReload={loadStudents} />
            )}
            {activeTab === 'lessons' && (
              <LessonManagement lessons={lessons} setLessons={setLessons} students={students} />
            )}
            {activeTab === 'messages' && (
              <SimpleChatContainer userType="instructor" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Student Management Component
const StudentManagement = ({ students, setStudents, onReload }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newStudent, setNewStudent] = useState({ name: '', email: '', phone: '' });
  const [loading, setLoading] = useState(false);
  const { token, setError } = useAuth();

  const handleAddStudent = async (e) => {
    e.preventDefault();
    
    if (!newStudent.name || !newStudent.email) {
      setError('Name and email are required');
      return;
    }

    try {
      setLoading(true);
      
      // Kiểm tra userId trong localStorage
      const storedUserId = localStorage.getItem('userId');
      console.log('Current userId in localStorage:', storedUserId);
      
      // Log chi tiết để debug
      console.log('Student data being sent:', {
        name: newStudent.name,
        phone: newStudent.phone || '',
        email: newStudent.email
      });
      console.log('Using auth token:', token);
      
      const response = await instructorAPI.addStudent(newStudent, token);
      console.log('Add student response:', response);
      
      if (response && response.message && response.message.includes('successfully')) {
        // Thành công
        console.log('Student added successfully');
        setNewStudent({ name: '', email: '', phone: '' });
        setShowAddModal(false);
        onReload(); // Reload students list
      } else {
        // Hiển thị lỗi chi tiết
        const errorMsg = response.error || response.message || 'Failed to add student';
        console.error('Failed to add student:', errorMsg);
        setError(errorMsg);
      }
    } catch (error) {
      console.error('Add student error:', error);
      setError(`Failed to add student: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (studentId) => {
    if (!confirm('Are you sure you want to delete this student?')) {
      return;
    }

    try {
      const response = await instructorAPI.deleteStudent(studentId, token);
      
      if (response && response.message && response.message.includes('successfully')) {
        onReload(); // Reload students list
      } else {
        setError(response.error || response.message || 'Failed to delete student');
      }
    } catch (error) {
      console.error('Delete student error:', error);
      setError('Failed to delete student: ' + error.message);
    }
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">👥 Manage Students</h4>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          + Add Student
        </button>
      </div>

      <div className="table-responsive">
        <table className="table table-hover">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Lessons</th>
              <th>Completed</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {students.map((student) => (
              <tr key={student.id}>
                <td className="fw-semibold">{student.name || 'N/A'}</td>
                <td>{student.email || 'N/A'}</td>
                <td>{student.phone || student.phoneNumber || 'N/A'}</td>
                <td>
                  <span className="badge bg-primary">{student.totalLessons || student.lessons || 0}</span>
                </td>
                <td>
                  <span className="badge bg-success">{student.completedLessons || student.completed || 0}</span>
                </td>
                <td>
                  <button className="btn btn-sm btn-outline-primary me-2">
                    Edit
                  </button>
                  <button 
                    className="btn btn-sm btn-outline-danger"
                    onClick={() => handleDeleteStudent(student.id)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {students.length === 0 && (
              <tr>
                <td colSpan="6" className="text-center py-4">
                  No students found. Add your first student to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="modal d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create Student</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>
              <form onSubmit={handleAddStudent}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Student Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={newStudent.name}
                        onChange={(e) => setNewStudent(prev => ({...prev, name: e.target.value}))}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone Number *</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={newStudent.phone}
                        onChange={(e) => setNewStudent(prev => ({...prev, phone: e.target.value}))}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        className="form-control"
                        value={newStudent.email}
                        onChange={(e) => setNewStudent(prev => ({...prev, email: e.target.value}))}
                        required
                      />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Role</label>
                      <select className="form-control" disabled>
                        <option>Student</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowAddModal(false)}
                    disabled={loading}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Creating...
                      </>
                    ) : (
                      'Create'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Lesson Management Component
const LessonManagement = ({ lessons, setLessons, students }) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newLesson, setNewLesson] = useState({ title: '', description: '', selectedStudents: [] });

  const handleAddLesson = (e) => {
    e.preventDefault();
    const lesson = {
      id: Date.now(),
      title: newLesson.title,
      description: newLesson.description,
      assignedStudents: newLesson.selectedStudents.length,
      completed: 0
    };
    setLessons(prev => [...prev, lesson]);
    setNewLesson({ title: '', description: '', selectedStudents: [] });
    setShowAddModal(false);
  };

  return (
    <>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4 className="mb-0">📚 Lesson Management</h4>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddModal(true)}
        >
          + Create Lesson
        </button>
      </div>

      <div className="row g-3">
        {lessons.map((lesson) => (
          <div key={lesson.id} className="col-md-6">
            <div className="card h-100">
              <div className="card-body">
                <h5 className="card-title">{lesson.title}</h5>
                <p className="card-text text-muted">{lesson.description}</p>
                <div className="d-flex justify-content-between small text-muted">
                  <span>👥 {lesson.assignedStudents} students</span>
                  <span>✅ {lesson.completed} completed</span>
                </div>
              </div>
              <div className="card-footer bg-transparent">
                <button className="btn btn-sm btn-outline-primary me-2">Edit</button>
                <button className="btn btn-sm btn-outline-success me-2">Assign</button>
                <button className="btn btn-sm btn-outline-danger">Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Lesson Modal */}
      {showAddModal && (
        <div className="modal d-block" tabIndex="-1" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Lesson</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => setShowAddModal(false)}
                ></button>
              </div>
              <form onSubmit={handleAddLesson}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Lesson Title *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newLesson.title}
                      onChange={(e) => setNewLesson(prev => ({...prev, title: e.target.value}))}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={newLesson.description}
                      onChange={(e) => setNewLesson(prev => ({...prev, description: e.target.value}))}
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Assign to Students</label>
                    {students.map((student) => (
                      <div key={student.id} className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          value={student.id}
                          onChange={(e) => {
                            const studentId = parseInt(e.target.value);
                            setNewLesson(prev => ({
                              ...prev,
                              selectedStudents: e.target.checked
                                ? [...prev.selectedStudents, studentId]
                                : prev.selectedStudents.filter(id => id !== studentId)
                            }));
                          }}
                        />
                        <label className="form-check-label">
                          {student.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create Lesson
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// Using SimpleChatContainer component instead of MessagingInterface

export default InstructorDashboard;
