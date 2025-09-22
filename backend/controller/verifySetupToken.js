// We've moved the functionality to studentAuthController.js to avoid duplication
// This file is kept temporarily to avoid breaking imports but should be removed in future refactors

const { verifySetupToken } = require('./studentAuthController');

module.exports = {
    verifySetupToken
};