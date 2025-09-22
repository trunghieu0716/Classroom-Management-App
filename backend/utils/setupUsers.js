const { db } = require("../config/firebaseAdmin");

/**
 * Format phone number to international format
 */
const formatPhoneNumber = (phoneNumber) => {
    // Remove all non-digits
    const digits = phoneNumber.replace(/\D/g, '');
    
    // If starts with 0, replace with +84
    if (digits.startsWith('0')) {
        return '+84' + digits.substring(1);
    }
    
    // If doesn't start with +, add +
    if (!phoneNumber.startsWith('+')) {
        return '+' + digits;
    }
    
    return phoneNumber;
};

/**
 * Setup initial users in Firebase with predefined roles
 * This should be run once to initialize the system
 */
const setupInitialUsers = async () => {
    try {
        console.log("🚀 Setting up initial users...");

        // Predefined users with roles
        const initialUsers = [
            {
                phoneNumber: "+84943554223", // Your instructor number
                userType: "instructor",
                name: "Instructor User",
                email: "instructor@example.com"
            },
            {
                phoneNumber: "+84932583717", // Your test number
                userType: "student",
                name: "Student User",
                email: "student@example.com"
            }
            // Add more users as needed
        ];

        for (const user of initialUsers) {
            const formattedPhone = formatPhoneNumber(user.phoneNumber);
            
            await db.collection("users").doc(formattedPhone).set({
                phoneNumber: formattedPhone,
                userType: user.userType,
                name: user.name,
                email: user.email,
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            console.log(`✅ Created ${user.userType}: ${formattedPhone} (${user.name})`);
        }

        console.log("🎉 Initial users setup completed!");
        
    } catch (error) {
        console.error("❌ Error setting up users:", error);
    }
};

/**
 * Add a new instructor (only run by admin)
 */
const addInstructor = async (phoneNumber, name, email) => {
    try {
        const formattedPhone = formatPhoneNumber(phoneNumber);
        
        await db.collection("users").doc(formattedPhone).set({
            phoneNumber: formattedPhone,
            userType: "instructor",
            name: name,
            email: email,
            isActive: false,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log(`✅ Added instructor: ${formattedPhone} (${name})`);
        return { success: true, phoneNumber: formattedPhone };
        
    } catch (error) {
        console.error("❌ Error adding instructor:", error);
        throw error;
    }
};

/**
 * Add a new student (called by instructor)
 */
const addStudent = async (phoneNumber, name, email, instructorPhone) => {
    try {
        const formattedPhone = formatPhoneNumber(phoneNumber);
        const formattedInstructorPhone = formatPhoneNumber(instructorPhone);
        
        await db.collection("users").doc(formattedPhone).set({
            phoneNumber: formattedPhone,
            userType: "student",
            name: name,
            email: email,
            instructorPhone: formattedInstructorPhone, // Link to instructor
            isActive: false,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        console.log(`✅ Added student: ${formattedPhone} (${name}) under instructor ${formattedInstructorPhone}`);
        return { success: true, phoneNumber: formattedPhone };
        
    } catch (error) {
        console.error("❌ Error adding student:", error);
        throw error;
    }
};

// For development - run this once
if (require.main === module) {
    setupInitialUsers().then(() => {
        process.exit(0);
    }).catch((error) => {
        console.error("Setup failed:", error);
        process.exit(1);
    });
}

module.exports = {
    setupInitialUsers,
    addInstructor,
    addStudent
};