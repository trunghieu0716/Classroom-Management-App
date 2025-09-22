const { db } = require("../config/firebaseAdmin");
const { formatPhoneNumber } = require("../config/twilio");
const { generateSecureOTP, isOTPExpired } = require("../utils/genCode");
const { sendOTPEmail, sendStudentInvitationEmail } = require("../service/newEmailService");

/**
 * POST /loginEmail
 * Parameters: email
 * Return: a random 6-digit access code
 * Other requirement: save this access code to the code in the database and send code to email
 */
const loginEmail = async (req, res) => {
    try {
        const { email } = req.body;

        // Validate email
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ error: "Invalid email format" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        console.log(`📧 Processing email login for: ${normalizedEmail}`);

        // Check if student exists with this email
        const studentsQuery = await db.collection("students")
            .where("email", "==", normalizedEmail)
            .get();

        if (studentsQuery.empty) {
            return res.status(404).json({ error: "Student not found with this email" });
        }

        // Generate 6-digit access code
        const accessCode = generateSecureOTP();
        const createdAt = new Date();
        const expiresAt = new Date(createdAt.getTime() + 5 * 60 * 1000); // 5 minutes

        // Save access code to database
        await db.collection("emailAccessCodes").doc(normalizedEmail).set({
            code: accessCode,
            email: normalizedEmail,
            createdAt,
            expiresAt,
            verified: false,
            attempts: 0
        });

        let emailResult;
        let usedMockEmail = false;

        try {
            // Try to send real email first
            emailResult = await sendAccessCodeEmail(normalizedEmail, accessCode);
            console.log(`✅ Access code sent via email`);
        } catch (emailError) {
            console.log(`⚠️ Email failed: ${emailError.message}`);
            console.log(`🔄 Using mock email...`);
            
            // Fallback to mock email
            emailResult = await sendMockEmail(normalizedEmail, accessCode);
            usedMockEmail = true;
        }

        res.json({
            success: true,
            message: usedMockEmail ? "Access code generated (check console)" : "Access code sent to your email",
            email: normalizedEmail,
            mockEmail: usedMockEmail,
            // Include access code in development mode
            ...(process.env.NODE_ENV !== 'production' && { 
                developmentCode: accessCode,
                note: "Access code included for development testing"
            })
        });

    } catch (error) {
        console.error("❌ Error in loginEmail:", error);
        res.status(500).json({ 
            error: "Failed to send access code",
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
};

/**
 * POST /validateAccessCode
 * Parameters: accessCode, email
 * Return: { success: true }
 * Other requirement: set the access code to empty string once validation is complete
 */
const validateAccessCode = async (req, res) => {
    try {
        const { accessCode, email } = req.body;

        // Validate input
        if (!accessCode || !email) {
            return res.status(400).json({ error: "Access code and email are required" });
        }

        const normalizedEmail = email.toLowerCase().trim();
        console.log(`🔍 Validating access code for: ${normalizedEmail}`);

        // Get access code from database
        const codeDoc = await db.collection("emailAccessCodes").doc(normalizedEmail).get();

        if (!codeDoc.exists) {
            return res.status(400).json({ error: "Access code not found or expired" });
        }

        const codeData = codeDoc.data();

        // Check if code is expired
        if (isOTPExpired(codeData.createdAt.toDate())) {
            await db.collection("emailAccessCodes").doc(normalizedEmail).delete();
            return res.status(400).json({ error: "Access code has expired" });
        }

        // Check if code is already verified
        if (codeData.verified) {
            return res.status(400).json({ error: "Access code has already been used" });
        }

        // Check attempts limit
        if (codeData.attempts >= 3) {
            await db.collection("emailAccessCodes").doc(normalizedEmail).delete();
            return res.status(400).json({ error: "Too many attempts. Please request a new access code" });
        }

        // Validate access code
        if (codeData.code !== accessCode) {
            // Increment attempts
            await db.collection("emailAccessCodes").doc(normalizedEmail).update({
                attempts: codeData.attempts + 1
            });
            
            return res.status(400).json({ 
                error: "Invalid access code",
                attemptsLeft: 3 - (codeData.attempts + 1)
            });
        }

        // Code is valid - get student info
        const studentsQuery = await db.collection("students")
            .where("email", "==", normalizedEmail)
            .get();

        if (studentsQuery.empty) {
            return res.status(404).json({ error: "Student not found" });
        }

        const studentDoc = studentsQuery.docs[0];
        const studentData = studentDoc.data();

        // Set the access code to empty string (delete it)
        await db.collection("emailAccessCodes").doc(normalizedEmail).delete();

        // Update student last activity
        await db.collection("students").doc(studentDoc.id).update({
            lastActivity: new Date()
        });

        console.log(`✅ Access code validated for: ${studentData.name}`);

        res.json({
            success: true,
            message: "Access code validated successfully",
            student: {
                phone: studentData.phone,
                name: studentData.name,
                email: studentData.email
            }
        });

    } catch (error) {
        console.error("❌ Error validating access code:", error);
        res.status(500).json({ error: "Failed to validate access code" });
    }
};

/**
 * GET /myLessons?phone=xxx
 * Return all assigned lessons
 */
const getMyLessons = async (req, res) => {
    try {
        const { phone } = req.query;

        if (!phone) {
            return res.status(400).json({ error: "Phone number is required" });
        }

        const formattedPhone = formatPhoneNumber(phone);
        console.log(`📚 Fetching lessons for student: ${formattedPhone}`);

        // Check if student exists
        const studentDoc = await db.collection("students").doc(formattedPhone).get();
        if (!studentDoc.exists) {
            return res.status(404).json({ error: "Student not found" });
        }

        const studentData = studentDoc.data();

        // Get all lessons for this student
        const lessonsSnapshot = await db.collection("students")
            .doc(formattedPhone)
            .collection("lessons")
            .orderBy("assignedAt", "desc")
            .get();

        const lessons = [];
        lessonsSnapshot.forEach(doc => {
            const lessonData = doc.data();
            lessons.push({
                id: doc.id,
                title: lessonData.title,
                description: lessonData.description,
                assignedAt: lessonData.assignedAt,
                isCompleted: lessonData.isCompleted,
                completedAt: lessonData.completedAt
            });
        });

        console.log(`✅ Found ${lessons.length} lessons for ${studentData.name}`);

        res.json({
            success: true,
            student: {
                phone: formattedPhone,
                name: studentData.name,
                email: studentData.email
            },
            lessons: lessons,
            totalLessons: lessons.length,
            completedLessons: lessons.filter(lesson => lesson.isCompleted).length,
            pendingLessons: lessons.filter(lesson => !lesson.isCompleted).length
        });

    } catch (error) {
        console.error("❌ Error fetching lessons:", error);
        res.status(500).json({ 
            error: "Failed to fetch lessons",
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
};

/**
 * POST /markLessonDone
 * Params: phone, lessonId
 * Mark lesson as completed in Firebase
 */
const markLessonDone = async (req, res) => {
    try {
        const { phone, lessonId } = req.body;

        // Validate input
        if (!phone || !lessonId) {
            return res.status(400).json({ error: "Phone and lesson ID are required" });
        }

        const formattedPhone = formatPhoneNumber(phone);
        console.log(`✅ Marking lesson ${lessonId} as completed for: ${formattedPhone}`);

        // Check if student exists
        const studentDoc = await db.collection("students").doc(formattedPhone).get();
        if (!studentDoc.exists) {
            return res.status(404).json({ error: "Student not found" });
        }

        // Check if lesson exists
        const lessonDoc = await db.collection("students")
            .doc(formattedPhone)
            .collection("lessons")
            .doc(lessonId)
            .get();

        if (!lessonDoc.exists) {
            return res.status(404).json({ error: "Lesson not found" });
        }

        const lessonData = lessonDoc.data();

        // Check if lesson is already completed
        if (lessonData.isCompleted) {
            return res.status(400).json({ error: "Lesson is already completed" });
        }

        // Mark lesson as completed
        await db.collection("students")
            .doc(formattedPhone)
            .collection("lessons")
            .doc(lessonId)
            .update({
                isCompleted: true,
                completedAt: new Date()
            });

        // Update student's completed lessons count
        const studentData = studentDoc.data();
        await db.collection("students").doc(formattedPhone).update({
            completedLessons: (studentData.completedLessons || 0) + 1,
            lastActivity: new Date()
        });

        console.log(`✅ Lesson completed: ${lessonData.title}`);

        res.json({
            success: true,
            message: "Lesson marked as completed",
            lesson: {
                id: lessonId,
                title: lessonData.title,
                completedAt: new Date()
            }
        });

    } catch (error) {
        console.error("❌ Error marking lesson as done:", error);
        res.status(500).json({ 
            error: "Failed to mark lesson as completed",
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
};

/**
 * PUT /editProfile
 * Params: phone, name, email
 * Update student profile
 */
const editProfile = async (req, res) => {
    try {
        const { phone, name, email } = req.body;

        // Validate input
        if (!phone) {
            return res.status(400).json({ error: "Phone number is required" });
        }

        if (!name && !email) {
            return res.status(400).json({ error: "At least name or email must be provided" });
        }

        const formattedPhone = formatPhoneNumber(phone);
        console.log(`✏️ Editing profile for student: ${formattedPhone}`);

        // Check if student exists
        const studentDoc = await db.collection("students").doc(formattedPhone).get();
        if (!studentDoc.exists) {
            return res.status(404).json({ error: "Student not found" });
        }

        // Validate email format if provided
        if (email) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                return res.status(400).json({ error: "Invalid email format" });
            }

            // Check if email already exists for another student
            const emailQuery = await db.collection("students")
                .where("email", "==", email.toLowerCase().trim())
                .get();
            
            if (!emailQuery.empty && emailQuery.docs[0].id !== formattedPhone) {
                return res.status(400).json({ error: "Email already exists for another student" });
            }
        }

        // Prepare update data
        const updateData = {
            lastActivity: new Date()
        };

        if (name) {
            updateData.name = name.trim();
        }
        if (email) {
            updateData.email = email.toLowerCase().trim();
        }

        // Update student data
        await db.collection("students").doc(formattedPhone).update(updateData);

        // Also update user data
        await db.collection("users").doc(formattedPhone).update(updateData);

        console.log(`✅ Profile updated for: ${name || 'student'}`);

        res.json({
            success: true,
            message: "Profile updated successfully",
            updatedFields: updateData
        });

    } catch (error) {
        console.error("❌ Error updating profile:", error);
        res.status(500).json({ 
            error: "Failed to update profile",
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
};

/**
 * GET /
 * Return all students
 */
const getAllStudents = async (req, res) => {
    try {
        console.log("📚 Fetching all students");
        
        // Get all students from Firebase
        const studentsSnapshot = await db.collection("students").get();
        
        const students = [];
        studentsSnapshot.forEach(doc => {
            const studentData = doc.data();
            // Filter sensitive information
            students.push({
                id: doc.id,
                name: studentData.name,
                email: studentData.email,
                phone: studentData.phone
            });
        });
        
        console.log(`✅ Found ${students.length} students`);
        
        res.json({
            success: true,
            students: students
        });
        
    } catch (error) {
        console.error("❌ Error fetching students:", error);
        res.status(500).json({ 
            error: "Failed to fetch students",
            details: process.env.NODE_ENV !== 'production' ? error.message : undefined
        });
    }
};

module.exports = {
    loginEmail,
    validateAccessCode,
    getMyLessons,
    markLessonDone,
    editProfile,
    getAllStudents
};