const nodemailer = require("nodemailer");

// Email configuration
const EMAIL_CONFIG = {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS  // Your email password or app password
    }
};

// Create transporter
let transporter = null;

const initEmailService = () => {
    try {
        if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
            console.log("⚠️ Email service not configured - using development mode");
            return null;
        }

        transporter = nodemailer.createTransport(EMAIL_CONFIG);
        console.log("✅ Email service initialized");
        return transporter;
    } catch (error) {
        console.error("❌ Email service initialization failed:", error);
        return null;
    }
};

// Khởi tạo dịch vụ email ngay khi module được tải
transporter = initEmailService();

/**
 * Send OTP email to student
 */
const sendOTPEmail = async (email, otpCode) => {
    try {
        if (!transporter) {
            console.log("⚠️ Email service not available - returning OTP for development");
            return { success: true, developmentCode: otpCode };
        }

        const mailOptions = {
            from: `"Classroom Manager" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Your Classroom Manager Verification Code',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">🎓 Classroom Manager</h1>
                    </div>
                    
                    <div style="padding: 30px; background: #f8f9fa;">
                        <h2 style="color: #333; margin-bottom: 20px;">Your Verification Code</h2>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.5;">
                            Hello! Use the verification code below to access your student account:
                        </p>
                        
                        <div style="background: white; border: 2px dashed #28a745; border-radius: 10px; padding: 20px; margin: 20px 0; text-align: center;">
                            <span style="font-size: 32px; font-weight: bold; color: #28a745; letter-spacing: 5px;">
                                ${otpCode}
                            </span>
                        </div>
                        
                        <p style="color: #666; font-size: 14px;">
                            <strong>Important:</strong> This code will expire in 10 minutes for security reasons.
                        </p>
                        
                        <p style="color: #666; font-size: 14px;">
                            If you didn't request this code, please ignore this email.
                        </p>
                    </div>
                    
                    <div style="background: #e9ecef; padding: 20px; text-align: center; color: #6c757d; font-size: 12px;">
                        <p>© 2024 Classroom Manager. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ OTP email sent to: ${email}`);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error("❌ Failed to send OTP email:", error);
        // Return development code if email fails
        return { success: true, developmentCode: otpCode };
    }
};

/**
 * Send student invitation email with setup link
 */
const sendStudentInvitationEmail = async (email, name, setupToken) => {
    try {
        if (!transporter) {
            console.log("⚠️ Email service not available - returning setup link for development");
            return { 
                success: true, 
                developmentLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/student-setup?token=${setupToken}` 
            };
        }

        const setupLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/student-setup?token=${setupToken}`;

        const mailOptions = {
            from: `"Classroom Manager" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: 'Welcome to Classroom Manager - Set Up Your Account',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <div style="background: linear-gradient(135deg, #28a745 0%, #20c997 100%); padding: 30px; text-align: center;">
                        <h1 style="color: white; margin: 0;">🎓 Welcome to Classroom Manager</h1>
                    </div>
                    
                    <div style="padding: 30px; background: #f8f9fa;">
                        <h2 style="color: #333; margin-bottom: 20px;">Hello ${name}!</h2>
                        
                        <p style="color: #666; font-size: 16px; line-height: 1.5;">
                            Your instructor has invited you to join Classroom Manager. To get started, please set up your student account by clicking the button below:
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="${setupLink}" style="background: #28a745; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
                                🚀 Set Up My Account
                            </a>
                        </div>
                        
                        <p style="color: #666; font-size: 14px;">
                            <strong>What's next?</strong><br>
                            1. Click the button above to verify your email<br>
                            2. Create your login credentials<br>
                            3. Start learning with your assigned lessons!
                        </p>
                        
                        <p style="color: #666; font-size: 14px;">
                            If the button doesn't work, copy and paste this link into your browser:<br>
                            <a href="${setupLink}" style="color: #28a745; word-break: break-all;">${setupLink}</a>
                        </p>
                        
                        <p style="color: #666; font-size: 12px; margin-top: 30px;">
                            <strong>Security Notice:</strong> This invitation link will expire in 7 days. If you didn't expect this invitation, please ignore this email.
                        </p>
                    </div>
                    
                    <div style="background: #e9ecef; padding: 20px; text-align: center; color: #6c757d; font-size: 12px;">
                        <p>© 2024 Classroom Manager. All rights reserved.</p>
                    </div>
                </div>
            `
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`✅ Invitation email sent to: ${email}`);
        return { success: true, messageId: info.messageId };

    } catch (error) {
        console.error("❌ Failed to send invitation email:", error);
        return { 
            success: true, 
            developmentLink: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/student-setup?token=${setupToken}`,
            error: error.message 
        };
    }
};

// Initialize email service on module load
initEmailService();

module.exports = {
    sendOTPEmail,
    sendStudentInvitationEmail,
    initEmailService
};