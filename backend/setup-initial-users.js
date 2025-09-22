require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require('./config/serviceAccountKey.json');

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

/**
 * Format phone number to international format
 */
const formatPhoneNumber = (phoneNumber) => {
    const digits = phoneNumber.replace(/\D/g, '');
    if (digits.startsWith('0')) {
        return '+84' + digits.substring(1);
    }
    if (!phoneNumber.startsWith('+')) {
        return '+' + digits;
    }
    return phoneNumber;
};

/**
 * Setup initial users
 */
const setupInitialUsers = async () => {
    try {
        console.log("🚀 Setting up initial users...");

        const initialUsers = [
            {
                phoneNumber: "+84943554223", // Instructor
                userType: "instructor",
                name: "Instructor User",
                email: "instructor@example.com"
            },
            {
                phoneNumber: "+84932583717", // Student
                userType: "student", 
                name: "Student User",
                email: "student@example.com"
            }
        ];

        for (const user of initialUsers) {
            const formattedPhone = formatPhoneNumber(user.phoneNumber);
            
            // Create user in main collection
            await db.collection("users").doc(formattedPhone).set({
                phoneNumber: formattedPhone,
                userType: user.userType,
                name: user.name,
                email: user.email,
                isActive: false,
                createdAt: new Date(),
                updatedAt: new Date()
            });

            // Also create instructor in instructors collection
            if (user.userType === 'instructor') {
                await db.collection("instructors").doc(formattedPhone).set({
                    phoneNumber: formattedPhone,
                    name: user.name,
                    email: user.email,
                    isActive: false,
                    createdAt: new Date()
                });
            }

            // Also create student in students collection for email auth
            if (user.userType === 'student') {
                await db.collection("students").doc(user.email).set({
                    email: user.email,
                    phoneNumber: formattedPhone,
                    name: user.name,
                    setupCompleted: true, // Mark as completed for testing
                    isActive: false,
                    createdAt: new Date()
                });
            }

            console.log(`✅ Created ${user.userType}: ${formattedPhone} (${user.name})`);
        }

        console.log("🎉 Initial users setup completed!");
        
    } catch (error) {
        console.error("❌ Error setting up users:", error);
    }
};

// Run setup
setupInitialUsers().then(() => {
    console.log("✅ Setup completed, you can now start the server");
    process.exit(0);
}).catch((error) => {
    console.error("Setup failed:", error);
    process.exit(1);
});