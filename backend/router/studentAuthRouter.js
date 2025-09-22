const express = require('express');
const router = express.Router();
const studentAuthController = require('../controller/studentAuthController');

// Student authentication routes
router.post('/create-access-code', studentAuthController.createAccessCode);
router.post('/validate-access-code', studentAuthController.validateAccessCode);
router.post('/setup-account', studentAuthController.setupAccount);
router.post('/logout', studentAuthController.logout);
router.post('/verify-setup-token', studentAuthController.verifySetupToken);

module.exports = router;