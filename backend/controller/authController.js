const { db } = require("../config/firebaseAdmin");
const { sendOTP, formatPhoneNumber, sendMockOTP } = require("../config/twilio");
const { generateSecureOTP, generateSessionToken, isOTPExpired, validatePhoneNumber } = require("../utils/genCode");

// Create access code
const createAccessCode = async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ error: "Phone number is required" });
        }

        // Format phone number
        const formattedPhone = formatPhoneNumber(phoneNumber);
        console.log(`Creating access code for: ${formattedPhone}`);

        // Generate 6-digit access code
        const accessCode = generateSecureOTP();
        const createdAt = new Date();
        const expiresAt = new Date(createdAt.getTime() + 5 * 60 * 1000); // 5 minutes

        // Store in Firebase - đổi collection name cho phù hợp
        await db.collection("accessCodes").doc(formattedPhone).set({
            code: accessCode,
            createdAt,
            expiresAt,
            verified: false,
            attempts: 0
        });

        let smsResult;
        let usedMockSMS = false;

        try {
            // Try to send real SMS first
            smsResult = await sendOTP(formattedPhone, accessCode);
            console.log(`Access code sent via SMS`);
        } catch (smsError) {
            console.log(`SMS failed: ${smsError.message}`);
            console.log(`Falling back to mock SMS...`);
            
            // Use mock SMS as fallback
            smsResult = await sendMockOTP(formattedPhone, accessCode);
            usedMockSMS = true;
        }

        res.json({
            success: true,
            message: usedMockSMS ? "Access code generated (check console)" : "Access code sent successfully",
            phoneNumber: formattedPhone,
            mockSMS: usedMockSMS,
            // Include access code in development mode
            ...(process.env.NODE_ENV !== 'production' && { 
                developmentCode: accessCode,
                note: "Access code included for development testing"
            })
        });

    } catch (error) {
        console.error("Error in createAccessCode:", error);
        res.status(500).json({ 
            error: "Failed to create access code",
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
};

/**
 * Validate Access Code and authenticate user
 */
const validateAccessCode = async (req, res) => {
    try {
        const { phoneNumber, accessCode } = req.body;

        // Sửa lỗi: không cần userType nữa, sẽ lấy từ database
        if (!phoneNumber || !accessCode) {
            return res.status(400).json({ error: "Phone number and access code are required" });
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);
        console.log(`Validating access code for: ${formattedPhone}`);

        // Get access code from database - đổi collection name
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

        // Sửa lỗi: verify access code thay vì otpCode
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

        // Code is valid - check if user exists and get their role
        const userDoc = await db.collection("users").doc(formattedPhone).get();
        
        if (!userDoc.exists) {
            return res.status(400).json({ 
                error: "User not found. Please contact administrator to register your phone number." 
            });
        }

        const userData = userDoc.data();
        
        if (!userData.userType) {
            return res.status(400).json({ 
                error: "User role not assigned. Please contact administrator." 
            });
        }

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

        console.log(`✅ User authenticated: ${formattedPhone} as ${userData.userType}`);

        res.json({
            success: true,
            message: "Authentication successful",
            phoneNumber: formattedPhone,
            userType: userData.userType,
            token: sessionToken,
            user: {
                phoneNumber: formattedPhone,
                userType: userData.userType,
                name: userData.name || '',
                email: userData.email || ''
            }
        });

    } catch (error) {
        console.error("❌ Error validating access code:", error);
        res.status(500).json({ error: "Failed to validate access code" });
    }
};

/**
 * Helper endpoint to set user type (for development/testing)
 */
// const setUserType = async (req, res) => {
//     try {
//         const { userType } = req.body;
//         const authHeader = req.headers.authorization;

//         if (!authHeader || !authHeader.startsWith('Bearer ')) {
//             return res.status(401).json({ error: "Authorization token required" });
//         }

//         const tempToken = authHeader.split(' ')[1];

//         if (!userType) {
//             return res.status(400).json({ error: "User type is required" });
//         }

//         if (!["instructor", "student"].includes(userType)) {
//             return res.status(400).json({ error: "User type must be 'instructor' or 'student'" });
//         }

//         // For now, we'll decode the phone number from the tempToken
//         // In a real app, you'd verify the JWT token
//         // This is a simplified approach for this implementation
//         let phoneNumber;
//         try {
//             // Assuming tempToken contains phone number (simplified approach)
//             // In production, use proper JWT verification
//             const tokenData = Buffer.from(tempToken, 'base64').toString();
//             phoneNumber = tokenData.split(':')[0]; // Format: "phoneNumber:timestamp"
//         } catch (e) {
//             return res.status(401).json({ error: "Invalid token format" });
//         }

//         const formattedPhone = formatPhoneNumber(phoneNumber);

//         // Update user type in database
//         await db.collection("users").doc(formattedPhone).set({
//             phoneNumber: formattedPhone,
//             userType: userType,
//             lastLogin: new Date(),
//             isActive: true
//         }, { merge: true });

//         // Generate final session token
//         const sessionToken = generateSessionToken();
//         await db.collection("users").doc(formattedPhone).update({
//             sessionToken: sessionToken
//         });

//         // Clean up the verified access code
//         await db.collection("accessCodes").doc(formattedPhone).delete();

//         res.json({
//             success: true,
//             message: `User type set to ${userType}`,
//             phoneNumber: formattedPhone,
//             userType: userType,
//             token: sessionToken,
//             user: {
//                 phoneNumber: formattedPhone,
//                 userType: userType
//             }
//         });

//     } catch (error) {
//         console.error("Error setting userType:", error);
//         res.status(500).json({ error: "Failed to set user type" });
//     }
// }
/**
 * DISABLED: setUserType endpoint - Role should be pre-defined in database
 * Users cannot choose their own role for security reasons
 */
/*
const setUserType = async (req, res) => {
    try {
        const { userType, phoneNumber } = req.body;

        if (!userType) {
            return res.status(400).json({ error: "User type is required" });
        }

        if (!phoneNumber) {
            return res.status(400).json({ error: "Phone number is required" });
        }

        if (!["instructor", "student"].includes(userType)) {
            return res.status(400).json({ error: "User type must be 'instructor' or 'student'" });
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);

        // Check if there's a verified access code for this phone
        const codeDoc = await db.collection("accessCodes").doc(formattedPhone).get();
        
        if (!codeDoc.exists || !codeDoc.data().verified) {
            return res.status(400).json({ error: "No verified access code found. Please complete phone verification first." });
        }

        // Create/update user with type
        await db.collection("users").doc(formattedPhone).set({
            phoneNumber: formattedPhone,
            userType: userType,
            lastLogin: new Date(),
            isActive: true,
            createdAt: new Date()
        }, { merge: true });

        // Generate final session token
        const sessionToken = generateSessionToken();
        await db.collection("users").doc(formattedPhone).update({
            sessionToken: sessionToken
        });

        // Clean up the verified access code
        await db.collection("accessCodes").doc(formattedPhone).delete();

        console.log(`✅ User type set: ${formattedPhone} -> ${userType}`);

        res.json({
            success: true,
            message: `User type set to ${userType}`,
            phoneNumber: formattedPhone,
            userType: userType,
            token: sessionToken,
            user: {
                phoneNumber: formattedPhone,
                userType: userType
            }
        });

    } catch (error) {
        console.error("❌ Error setting userType:", error);
        res.status(500).json({ 
            error: "Failed to set user type",
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
};
*/

/**
 * Verify session token
 */
const verifySession = async (req, res) => {
    try {
        const { sessionToken, phoneNumber } = req.body;

        if (!sessionToken || !phoneNumber) {
            return res.status(400).json({ error: "Session token and phone number are required" });
        }

        const userDoc = await db.collection("users").doc(phoneNumber).get();

        if (!userDoc.exists) {
            return res.status(401).json({ error: "User not found" });
        }

        const userData = userDoc.data();

        if (userData.sessionToken !== sessionToken || !userData.isActive) {
            return res.status(401).json({ error: "Invalid session" });
        }

        res.json({
            success: true,
            user: {
                phoneNumber: userData.phoneNumber,
                userType: userData.userType
            }
        });

    } catch (error) {
        console.error("Error verifying session:", error);
        res.status(500).json({ error: "Failed to verify session" });
    }
};

/**
 * Logout user
 */
const logout = async (req, res) => {
    try {
        const { phoneNumber } = req.body;

        if (!phoneNumber) {
            return res.status(400).json({ error: "Phone number is required" });
        }

        // Deactivate user session
        await db.collection("users").doc(phoneNumber).update({
            isActive: false,
            sessionToken: null,
            lastLogout: new Date()
        });

        res.json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (error) {
        console.error("Error during logout:", error);
        res.status(500).json({ error: "Failed to logout" });
    }
};

module.exports = {
    createAccessCode,
    validateAccessCode,
    // setUserType, // DISABLED - Role should be pre-defined
    verifySession,
    logout
};