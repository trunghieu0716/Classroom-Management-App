const express = require('express');
const router = express.Router();
const authMiddleware = require('../utils/authMiddleware');
const {
    getAllInstructors,
    getInstructor,
    updateInstructor,
    deleteInstructor,
    getInstructorStudents,
    addStudent,
    updateStudent,
    removeStudent,
    createLesson,
    getInstructorLessons,
    updateLesson,
    deleteLesson
} = require('../controller/instructorController');

// Create public route for listing all instructors (no auth required)
// This endpoint needs to be defined BEFORE applying middleware
router.get('/', getAllInstructors); // Liệt kê tất cả instructors

// Apply auth middleware to all other instructor routes
router.use(authMiddleware);

// Instructor routes - theo chuẩn yêu cầu
router.post('/addStudent', addStudent);
router.post('/assignLesson', createLesson); // Rename function but keep implementation
router.get('/students', getInstructorStudents);
router.get('/profile', getInstructor); // Get instructor's own profile
router.put('/profile', updateInstructor); // Update instructor's own profile
router.delete('/profile', deleteInstructor); // Delete instructor's own account
router.put('/student/:studentId', updateStudent);
router.delete('/student/:studentId', removeStudent);

// Lesson routes
router.get('/lessons', getInstructorLessons);
router.put('/lesson/:lessonId', updateLesson);
router.delete('/lesson/:lessonId', deleteLesson);

// Admin route moved above auth middleware for public access

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Instructor routes are working!' });
});

module.exports = router;