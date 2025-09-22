const express = require('express');
const router = express.Router();
const instructorAuthController = require('../controller/instructorAuthController');

// Instructor authentication routes
router.post('/create-access-code', instructorAuthController.createAccessCode);
router.post('/validate-access-code', instructorAuthController.validateAccessCode);
router.post('/logout', instructorAuthController.logout);

module.exports = router;