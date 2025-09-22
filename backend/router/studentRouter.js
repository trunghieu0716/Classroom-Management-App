const express = require('express');
const router = express.Router();
const {
    loginEmail,
    validateAccessCode,
    getMyLessons,
    markLessonDone,
    editProfile,
    getAllStudents
} = require('../controller/studentController');


router.post('/loginEmail', loginEmail);

router.post('/validateAccessCode', validateAccessCode);

router.get('/myLessons', getMyLessons);

router.post('/markLessonDone', markLessonDone);

router.put('/editProfile', editProfile);

// Get all students for chat functionality
router.get('/', getAllStudents);

// Test route
router.get('/test', (req, res) => {
    res.json({ message: 'Student routes are working!' });
});

module.exports = router;