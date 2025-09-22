import React, { useEffect } from 'react'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './context/useAuth'
import AuthFlow from './components/AuthFlow'
import InstructorDashboard from './components/InstructorDashboard'
import StudentDashboard from './components/StudentDashboard'
import './App.css'

// Main app component that uses auth context
function AppContent() {
  const { isAuthenticated, user, loading, token } = useAuth()
  
  // Enhanced debug auth state
  console.log('📊 App auth state:', { 
    isAuthenticated, 
    user, 
    hasToken: !!token,
    loading,
    storedToken: localStorage.getItem('authToken'),
    storedUserType: localStorage.getItem('userType'),
    storedUser: localStorage.getItem('authUser')
  });
  
  // Log authentication state discrepancy but don't force reload (prevents infinite loop)
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      const storedToken = localStorage.getItem('authToken');
      const storedUserType = localStorage.getItem('userType');
      
      if (storedToken && storedUserType) {
        console.log('⚠️ Authentication discrepancy detected! Token exists but isAuthenticated is false');
        // Log the issue but don't force reload (preventing infinite loop)
        console.warn('Auth state inconsistency detected. Check authentication implementation.');
      }
    }
  }, [isAuthenticated, loading]);

  if (loading) {
    console.log('⏳ App is loading authentication state...');
    return (
      <div className="d-flex justify-content-center align-items-center min-vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    console.log('🔒 User not authenticated, showing login flow');
    return <AuthFlow />
  }

  console.log('✅ User authenticated, showing dashboard for:', user?.userType);
  
  // Show appropriate dashboard based on user role
  if (user?.userType === 'instructor') {
    return <InstructorDashboard user={user} />
  } else {
    return <StudentDashboard user={user} />
  }
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  )
}

export default App
