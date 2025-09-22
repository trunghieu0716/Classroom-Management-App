const { db } = require('../config/firebaseAdmin');
const { sendSMS, formatPhoneNumber } = require('../config/twilio');
const { generateSessionToken, isOTPExpired } = require('../utils/genCode');

/**
 * Create access code for instructor (SMS-based)
 */
const createAccessCode = async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ error: "Phone number is required" });
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);
        console.log(`Creating access code for instructor: ${formattedPhone}`);

        // Check if this phone number is registered as instructor
        const userDoc = await db.collection("users").doc(formattedPhone).get();
        
        if (!userDoc.exists) {
            return res.status(400).json({ 
                error: "Phone number not registered. Please contact administrator." 
            });
        }

        const userData = userDoc.data();
        if (userData.userType !== 'instructor') {
            return res.status(400).json({ 
                error: "This phone number is not registered as an instructor." 
            });
        }

        // Generate 6-digit code
        const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store in Firebase with expiration
        await db.collection("accessCodes").doc(formattedPhone).set({
            code: accessCode,
            phoneNumber: formattedPhone,
            userType: 'instructor',
            createdAt: new Date(),
            verified: false,
            attempts: 0
        });

        let developmentCode = null;
        
        // Send SMS
        try {
            await sendSMS(formattedPhone, `Your Classroom Manager verification code is: ${accessCode}. Valid for 10 minutes.`);
            console.log(`✅ SMS sent to instructor: ${formattedPhone}`);
        } catch (smsError) {
            console.error("⚠️ SMS failed, using development mode:", smsError.message);
            developmentCode = accessCode; // Return code for development
        }

        res.json({
            success: true,
            message: "Verification code sent to your phone",
            phoneNumber: formattedPhone,
            // Only include developmentCode in non-production
            ...(process.env.NODE_ENV !== 'production' && { developmentCode })
        });

    } catch (error) {
        console.error("❌ Error creating instructor access code:", error);
        res.status(500).json({ error: "Failed to create access code" });
    }
};

/**
 * Validate access code for instructor
 */
const validateAccessCode = async (req, res) => {
    try {
        const { phoneNumber, accessCode } = req.body;

        if (!phoneNumber || !accessCode) {
            return res.status(400).json({ error: "Phone number and access code are required" });
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);
        console.log(`Validating access code for instructor: ${formattedPhone}`);

        // Get access code from database
        const codeDoc = await db.collection("accessCodes").doc(formattedPhone).get();

        if (!codeDoc.exists) {
            return res.status(400).json({ error: "Access code not found or expired" });
        }

        const codeData = codeDoc.data();

        // Check if code is expired
        if (isOTPExpired(codeData.createdAt.toDate())) {
            await db.collection("accessCodes").doc(formattedPhone).delete();
            return res.status(400).json({ error: "Access code has expired" });
        }

        // Check if code is already verified
        if (codeData.verified) {
            return res.status(400).json({ error: "Access code has already been used" });
        }

        // Check attempts limit
        if (codeData.attempts >= 3) {
            await db.collection("accessCodes").doc(formattedPhone).delete();
            return res.status(400).json({ error: "Too many attempts, please request a new access code" });
        }

        // Verify access code
        if (codeData.code !== accessCode) {
            // Increment attempts
            await db.collection("accessCodes").doc(formattedPhone).update({
                attempts: codeData.attempts + 1
            });
            
            return res.status(400).json({
                error: "Invalid access code",
                attemptsLeft: 3 - (codeData.attempts + 1)
            });
        }

        // Get user data
        const userDoc = await db.collection("users").doc(formattedPhone).get();
        const userData = userDoc.data();

        // Kiểm tra user có trong collection instructors không
        const instructorDoc = await db.collection("instructors").doc(formattedPhone).get();
        let instructorId = formattedPhone;
        
        // Generate session token
        const sessionToken = generateSessionToken();
        
        // Update user with new session token and last login
        await db.collection("users").doc(formattedPhone).update({
            sessionToken: sessionToken,
            lastLogin: new Date(),
            isActive: true
        });

        // Clean up the access code
        await db.collection("accessCodes").doc(formattedPhone).delete();

        console.log(`✅ Instructor authenticated: ${formattedPhone}`);

        res.json({
            success: true,
            message: "Authentication successful",
            phoneNumber: formattedPhone,
            userType: userData.userType,
            token: sessionToken,
            user: {
                id: instructorId,
                phoneNumber: formattedPhone,
                userType: userData.userType,
                name: userData.name || '',
                email: userData.email || ''
            }
        });

    } catch (error) {
        console.error("❌ Error validating instructor access code:", error);
        res.status(500).json({ error: "Failed to validate access code" });
    }
};

/**
 * Logout instructor
 */
const logout = async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ error: "Phone number is required" });
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);

        // Deactivate user session
        await db.collection("users").doc(formattedPhone).update({
            isActive: false,
            sessionToken: null,
            lastLogout: new Date()
        });

        res.json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (error) {
        console.error("Error during instructor logout:", error);
        res.status(500).json({ error: "Failed to logout" });
    }
};

module.exports = {
    createAccessCode,
    validateAccessCode,
    logout
};