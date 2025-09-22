const express = require('express');
const router = express.Router();
const {
    createAccessCode,
    validateAccessCode,
    // setUserType, // DISABLED - Role should be pre-defined
    verifySession,
    logout
} = require('../controller/authController');

//send otp to phone number
router.post('/createAccessCode', createAccessCode);

//verify otp code and auth user
router.post('/validateAccessCode', validateAccessCode);

//DISABLED: setUserType route - Role should be pre-defined in database
//router.post('/setUserType', setUserType);

//verify session token
router.post('/verify-session', verifySession);

//logout user
router.post('/logout', logout);

//test route
router.get('/test', (req, res) => {
    res.json({ message: 'Auth route is working' });
});

module.exports = router;