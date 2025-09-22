# Classroom Management App - Frontend

A modern React frontend for the Classroom Management System with SMS authentication, real-time chat, and role-based dashboards.

## Features

### Authentication

- 📱 SMS-based login with verification codes
- 🔒 Role selection (Instructor/Student)
- 💾 Persistent sessions with localStorage

### Instructor Dashboard

- 👥 Student Management (Add/Remove students)
- 📚 Lesson Management (Create/Assign lessons)
- 💬 Real-time chat with students
- 📊 Statistics overview

### Student Dashboard

- 📖 View assigned lessons
- ✅ Mark lessons as completed
- 👤 Profile management
- 💬 Chat with instructors
- 📊 Progress tracking

### Real-time Features

- 🔄 Live chat with Socket.io
- 📨 Instant message notifications
- 🏃‍♂️ Real-time updates across devices

## Tech Stack

- **React 19.1.1** - Modern UI framework
- **Vite 7.1.2** - Fast build tool
- **Socket.io Client** - Real-time communication
- **CSS3** - Custom responsive styling
- **Context API** - State management

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- npm or yarn
- Backend server running on http://localhost:3000

### Installation

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Start development server**

   ```bash
   npm run dev
   ```

3. **Open in browser**
   - Frontend: http://localhost:5173
   - Backend: http://localhost:3000

### Build for Production

```bash
npm run build
npm run preview
```

## Project Structure

```
src/
├── components/           # React components
│   ├── AuthFlow.jsx     # Main authentication flow
│   ├── PhoneLogin.jsx   # Phone number input
│   ├── SmsVerification.jsx # SMS code verification
│   ├── RoleSelection.jsx # Role selection page
│   ├── InstructorDashboard.jsx # Instructor main page
│   ├── StudentDashboard.jsx # Student main page
│   ├── StudentManagement.jsx # Manage students
│   ├── LessonManagement.jsx # Manage lessons
│   ├── StudentLessons.jsx # View/complete lessons
│   ├── StudentProfile.jsx # Profile management
│   └── ChatInterface.jsx # Real-time chat
├── context/
│   └── AuthContext.jsx  # Authentication state
├── service/
│   └── api.js          # API communication
├── styles/
│   ├── Auth.css        # Authentication styling
│   └── Dashboard.css   # Dashboard styling
├── App.jsx             # Main app component
└── main.jsx           # App entry point
```

## API Integration

The frontend communicates with the backend through organized API modules:

- **authAPI** - Authentication endpoints
- **instructorAPI** - Instructor-specific functions
- **studentAPI** - Student-specific functions
- **chatAPI** - Chat and messaging

## Key Features

### Authentication Flow

1. **Phone Login** - Enter phone number
2. **SMS Verification** - Enter 6-digit code
3. **Role Selection** - Choose Instructor or Student
4. **Dashboard** - Access role-specific features

### Responsive Design

- 📱 Mobile-first approach
- 💻 Desktop optimized
- 🎨 Clean, modern UI
- ♿ Accessible components

### Real-time Chat

- 💬 Instant messaging
- 📱 Mobile-friendly interface
- 🔔 Unread message indicators
- 👥 Multiple conversation support

## Environment Configuration

The frontend expects the backend to be running on:

- **Backend URL**: http://localhost:3000
- **Socket.io**: Same origin (http://localhost:3000)

To change the backend URL, update the API base URL in `src/service/api.js`:

```javascript
const API_BASE_URL = "http://your-backend-url:port";
```

## Development

### Adding New Components

1. Create component in `src/components/`
2. Add styling in appropriate CSS file
3. Export from component file
4. Import and use in parent components

### State Management

- Use AuthContext for user authentication state
- Local state for component-specific data
- API calls through centralized service layer

### Styling Guidelines

- Use CSS custom properties for theming
- Follow BEM naming convention
- Responsive design with mobile-first approach
- Consistent spacing and typography

## Testing

### Manual Testing Checklist

**Authentication:**

- [ ] Phone number validation
- [ ] SMS code verification
- [ ] Role selection
- [ ] Session persistence

**Instructor Features:**

- [ ] Add/remove students
- [ ] Create lessons
- [ ] Assign lessons
- [ ] Send messages

**Student Features:**

- [ ] View lessons
- [ ] Complete lessons
- [ ] Update profile
- [ ] Chat with instructors

**Real-time Features:**

- [ ] Instant message delivery
- [ ] Online status
- [ ] Unread count updates

## Troubleshooting

### Common Issues

**Build Errors:**

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**API Connection Issues:**

- Verify backend is running on port 3000
- Check network connectivity
- Ensure CORS is configured in backend

**Socket.io Connection Issues:**

- Verify Socket.io server is running
- Check browser network tab for WebSocket connection
- Ensure no firewall blocking connections

**Authentication Issues:**

- Clear localStorage: `localStorage.clear()`
- Check browser console for errors
- Verify SMS service is working in backend

## Performance Optimization

- 🚀 Vite for fast development builds
- 📦 Code splitting with React.lazy()
- 🗜️ Image optimization
- 📊 Bundle analysis with vite-bundle-analyzer

## Browser Support

- ✅ Chrome 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- 📱 Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

1. Follow the existing code style
2. Add comments for complex logic
3. Test thoroughly before submitting
4. Update documentation as needed

## License

This project is part of the Classroom Management System.+ Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
