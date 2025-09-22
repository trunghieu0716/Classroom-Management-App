const { db } = require('../config/firebaseAdmin');
const { sendOTPEmail, sendStudentInvitationEmail } = require('../service/newEmailService');
const { generateSessionToken, isOTPExpired } = require('../utils/genCode');

/**
 * Create access code for student (Email-based)
 */
const createAccessCode = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email address is required" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        console.log(`Creating access code for student: ${normalizedEmail}`);

        // Check if this email is registered as student - first try with email as doc ID
        let userDoc = await db.collection("students").doc(normalizedEmail).get();
        let userData = null;
        
        // If not found by doc ID, try querying by email field
        if (!userDoc.exists) {
            console.log("Student not found by doc ID, trying by email field...");
            const querySnapshot = await db.collection("students")
                .where("email", "==", normalizedEmail)
                .get();
                
            if (!querySnapshot.empty) {
                userDoc = querySnapshot.docs[0];
                userData = userDoc.data();
                console.log(`Found student by email field: ${userData.name}`);
            }
        } else {
            userData = userDoc.data();
        }
        
        // If student doesn't exist, auto-create a basic record
        if (!userDoc.exists) {
            console.log(`Creating new student record for: ${normalizedEmail}`);
            const newStudentData = {
                email: normalizedEmail,
                setupCompleted: true, // Default to true for immediate usage
                createdAt: new Date(),
                userType: 'student',
                name: normalizedEmail.split('@')[0], // Default name from email
                isActive: true
            };
            
            await db.collection("students").doc(normalizedEmail).set(newStudentData);
            userData = newStudentData;
            userDoc = await db.collection("students").doc(normalizedEmail).get();
            console.log(`Created new student record for: ${normalizedEmail}`);
        } else if (userData.setupCompleted === false) {
            // If record exists but setup not completed, auto-complete it
            console.log(`Auto-completing setup for: ${normalizedEmail}`);
            if (userDoc.ref) {
                await userDoc.ref.update({ setupCompleted: true });
            } else {
                await db.collection("students").doc(normalizedEmail).update({ setupCompleted: true });
            }
            userData.setupCompleted = true;
        }

        // Generate 6-digit code
        const accessCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store in Firebase with expiration
        await db.collection("studentAccessCodes").doc(normalizedEmail).set({
            code: accessCode,
            email: normalizedEmail,
            createdAt: new Date(),
            verified: false,
            attempts: 0,
            // Store document reference path for retrieval later if found by query
            studentDocPath: userDoc.ref ? userDoc.ref.path : `students/${normalizedEmail}`
        });

        // Send email with OTP
        const emailResult = await sendOTPEmail(normalizedEmail, accessCode);
        
        let response = {
            success: true,
            message: "Verification code sent to your email",
            email: normalizedEmail
        };

        // Include development code if email service is not configured
        if (emailResult.developmentCode) {
            response.developmentCode = emailResult.developmentCode;
        }

        res.json(response);

    } catch (error) {
        console.error("❌ Error creating student access code:", error);
        res.status(500).json({ error: "Failed to create access code" });
    }
};

/**
 * Validate access code for student
 */
const validateAccessCode = async (req, res) => {
    try {
        const { email, accessCode } = req.body;

        if (!email || !accessCode) {
            return res.status(400).json({ error: "Email and access code are required" });
        }

        const normalizedEmail = email.trim().toLowerCase();
        console.log(`Validating access code for student: ${normalizedEmail}`);

        // Get access code from database
        const codeDoc = await db.collection("studentAccessCodes").doc(normalizedEmail).get();

        if (!codeDoc.exists) {
            return res.status(400).json({ error: "Access code not found or expired" });
        }

        const codeData = codeDoc.data();

        // Check if code is expired
        if (isOTPExpired(codeData.createdAt.toDate())) {
            await db.collection("studentAccessCodes").doc(normalizedEmail).delete();
            return res.status(400).json({ error: "Access code has expired" });
        }

        // Check if code is already verified
        if (codeData.verified) {
            return res.status(400).json({ error: "Access code has already been used" });
        }

        // Check attempts limit
        if (codeData.attempts >= 3) {
            await db.collection("studentAccessCodes").doc(normalizedEmail).delete();
            return res.status(400).json({ error: "Too many attempts, please request a new access code" });
        }

        // Verify access code
        if (codeData.code !== accessCode) {
            // Increment attempts
            await db.collection("studentAccessCodes").doc(normalizedEmail).update({
                attempts: codeData.attempts + 1
            });
            
            return res.status(400).json({
                error: "Invalid access code",
                attemptsLeft: 3 - (codeData.attempts + 1)
            });
        }

        // Get user data - first try with email as doc ID
        let userDoc = await db.collection("students").doc(normalizedEmail).get();
        let userData = null;
        
        // If not found by doc ID, try querying by email field
        if (!userDoc.exists) {
            console.log("Student not found by doc ID, trying by email field...");
            const querySnapshot = await db.collection("students")
                .where("email", "==", normalizedEmail)
                .get();
                
            if (!querySnapshot.empty) {
                userDoc = querySnapshot.docs[0];
                userData = userDoc.data();
                console.log(`Found student by email field: ${userData.name}`);
            }
        } else {
            userData = userDoc.data();
        }
        
        if (!userDoc.exists) {
            return res.status(400).json({ 
                error: "Student record not found" 
            });
        }

        // Generate session token
        const sessionToken = generateSessionToken();
        
        // Get the student document path from the access code if available
        const studentDocPath = codeData.studentDocPath || `students/${normalizedEmail}`;
        
        // Update user with new session token and last login
        if (studentDocPath.includes('/')) {
            // Use document reference from path
            await db.doc(studentDocPath).update({
                sessionToken: sessionToken,
                lastLogin: new Date(),
                isActive: true
            });
        } else {
            // Fallback to direct document ID
            await db.collection("students").doc(normalizedEmail).update({
                sessionToken: sessionToken,
                lastLogin: new Date(),
                isActive: true
            });
        }

        // Clean up the access code
        await db.collection("studentAccessCodes").doc(normalizedEmail).delete();

        console.log(`✅ Student authenticated: ${normalizedEmail}`);

        // Prepare user data for response
        const userResponseData = {
            id: userDoc.id || normalizedEmail,
            email: normalizedEmail,
            userType: 'student',
            name: userData.name || '',
            phoneNumber: userData.phoneNumber || '',
            // Include any other necessary user data
            isActive: true,
            lastLogin: new Date()
        };

        console.log('✅ Returning student data:', userResponseData);
        
        res.json({
            success: true,
            message: "Authentication successful",
            email: normalizedEmail,
            userType: 'student',
            token: sessionToken,
            user: userResponseData
        });

    } catch (error) {
        console.error("❌ Error validating student access code:", error);
        res.status(500).json({ error: "Failed to validate access code" });
    }
};

/**
 * Student account setup (from invitation link) - simplified version
 */
const setupAccount = async (req, res) => {
    try {
        const { token, name, email: providedEmail, password } = req.body;

        if (!name || !password) {
            return res.status(400).json({ 
                error: "Name and password are required" 
            });
        }

        // Simplified token handling - just get the email
        let email = providedEmail;
        
        // If no email provided directly, try to get from token
        if (!email && token) {
            try {
                const tokenData = Buffer.from(token, 'base64').toString();
                const [tokenEmail] = tokenData.split(':');
                
                if (tokenEmail && tokenEmail.includes('@')) {
                    email = tokenEmail;
                }
            } catch (e) {
                console.error("Error decoding token:", e);
            }
        }
        
        if (!email) {
            return res.status(400).json({ error: "Email is required for account setup" });
        }
        
        console.log(`Setting up student account for: ${email}`);
        
        // Check if student record already exists
        let studentDoc = await db.collection("students").doc(email).get();
        let studentExists = false;
        
        // Also check by email field for existing record
        if (!studentDoc.exists) {
            const querySnapshot = await db.collection("students")
                .where("email", "==", email)
                .limit(1)
                .get();
                
            if (!querySnapshot.empty) {
                studentDoc = querySnapshot.docs[0];
                studentExists = true;
                console.log(`Found existing student by email field: ${email}`);
            }
        } else {
            studentExists = true;
        }
        
        // Student data to save
        const studentData = {
            name: name,
            email: email,
            username: email, 
            password: password, // In production, hash this!
            setupCompleted: true,
            setupDate: new Date(),
            userType: 'student',
            createdAt: new Date(),
            isActive: true
        };
        
        // Create or update student record
        if (studentExists) {
            console.log(`Updating existing student: ${email}`);
            
            // Use the reference if it came from a query
            if (studentDoc.ref) {
                await studentDoc.ref.update(studentData);
            } else {
                // Use direct doc ID update
                await db.collection("students").doc(email).update(studentData);
            }
        } else {
            console.log(`Creating new student: ${email}`);
            // Create new student record
            await db.collection("students").doc(email).set(studentData);
        }

        console.log(`✅ Student account setup completed: ${email}`);

        res.json({
            success: true,
            message: "Account setup completed successfully",
            email: email
        });

    } catch (error) {
        console.error("❌ Error setting up student account:", error);
        res.status(500).json({ error: "Failed to setup account" });
    }
};

/**
 * Logout student
 */
const logout = async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const normalizedEmail = email.trim().toLowerCase();

        // Find student record - first try with email as doc ID
        let studentDoc = await db.collection("students").doc(normalizedEmail).get();
        
        // If not found by doc ID, try querying by email field
        if (!studentDoc.exists) {
            console.log("Student not found by doc ID, trying by email field...");
            const querySnapshot = await db.collection("students")
                .where("email", "==", normalizedEmail)
                .get();
                
            if (!querySnapshot.empty) {
                // Use the first found document
                studentDoc = querySnapshot.docs[0];
                
                // Update using the reference from query
                await studentDoc.ref.update({
                    isActive: false,
                    sessionToken: null,
                    lastLogout: new Date()
                });
                
                console.log(`Logged out student by email field: ${normalizedEmail}`);
            } else {
                return res.status(404).json({ error: "Student record not found" });
            }
        } else {
            // Update using the document ID
            await db.collection("students").doc(normalizedEmail).update({
                isActive: false,
                sessionToken: null,
                lastLogout: new Date()
            });
        }

        res.json({
            success: true,
            message: "Logged out successfully"
        });

    } catch (error) {
        console.error("Error during student logout:", error);
        res.status(500).json({ error: "Failed to logout" });
    }
};

/**
 * Verify a setup token for account creation - simplified version
 */
const verifySetupToken = async (req, res) => {
    try {
        const { token, email } = req.body;

        if (!token) {
            return res.status(400).json({ error: "Setup token is required" });
        }

        console.log(`Verifying setup token: ${token}`);
        
        // Simplified token verification - just check if it's a valid base64 string
        // and contains an email
        let studentEmail = email;
        
        try {
            // If email not provided, try to extract from token
            if (!studentEmail) {
                try {
                    const tokenData = Buffer.from(token, 'base64').toString();
                    const [tokenEmail] = tokenData.split(':');
                    
                    if (tokenEmail && tokenEmail.includes('@')) {
                        studentEmail = tokenEmail;
                    } else {
                        throw new Error("Invalid email in token");
                    }
                } catch (e) {
                    console.error("Error decoding token:", e);
                    // If we can't decode token but have an email parameter, continue with that
                    if (!email) {
                        return res.status(400).json({ error: "Invalid setup token format" });
                    }
                }
            }
            
            // Simple check - make sure we have an email
            if (!studentEmail) {
                return res.status(400).json({ error: "No email provided or found in token" });
            }
            
            console.log(`✅ Token verified with email: ${studentEmail}`);
            
            // Success - don't try to find the student in the database yet
            // We'll create/update the student record during the account setup process
            res.json({
                success: true,
                message: "Setup token is valid",
                student: {
                    name: '',  // These will be filled in by the user during setup
                    email: studentEmail,
                    phone: ''
                },
                email: studentEmail // Added for backwards compatibility
            });
        } catch (error) {
            console.error("Token verification error:", error);
            return res.status(400).json({ error: "Invalid token format" });
        }

    } catch (error) {
        console.error("❌ Error verifying setup token:", error);
        res.status(500).json({ error: "Failed to verify setup token" });
    }
};

module.exports = {
    createAccessCode,
    validateAccessCode,
    setupAccount,
    logout,
    verifySetupToken
};