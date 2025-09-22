const crypto = require('crypto');
const { create } = require('domain');

/**
 * Generate a random 6-digit OTP code
 * @returns {string} - 6-digit OTP code
 */
const generateOTP = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Generate a more secure 6-digit OTP using crypto
 * @returns {string} - 6-digit OTP code
 */

const generateSecureOTP = () => {
    const buffer = crypto.randomBytes(3);
    const num = parseInt(buffer.toString('hex'), 16);
    return (num % 900000 + 100000).toString();   
};

const generateSessionToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

/**
 * Check if OTP is expired (5 minutes)
 * @param {Date} createdAt - When the OTP was created
 * @returns {boolean} - True if expired
 */

const isOTPExpired = (createdAt) => {
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    return createdAt < fiveMinutesAgo;
};

/**
 * Validate phone number format
 * @param {string} phoneNumber - Phone number to validate
 * @returns {boolean} - True if valid
 */

const validatePhoneNumber = (phoneNumber) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber);
};

module.exports = {
    generateOTP,
    generateSecureOTP,
    isOTPExpired,
    validatePhoneNumber,
    generateSessionToken
};