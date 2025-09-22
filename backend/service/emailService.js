const nodemailer = require("nodemailer");

//create email transport
const transport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

/**
 * Send email with access code
 * @param {string} email - Recipient email
 * @param {string} accessCode - 6-digit access code
 * @returns {Promise}
 */
const sendAccessCodeEmail = async (email, accessCode) => {
    try{
        const mailOptions = {
            from: process.env.GMAIL_USER,
            to: email,
            subject: "Your classroom Access Code",
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #333;">🎓 Classroom Management System</h2>
                    <p>Hello,</p>
                    <p>Your access code for the Classroom Management System is:</p>
                    <div style="background-color: #f0f0f0; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
                        <h1 style="color: #007bff; font-size: 36px; margin: 0; letter-spacing: 8px;">${accessCode}</h1>
                    </div>
                    <p>This code will expire in <strong>5 minutes</strong>.</p>
                    <p>If you didn't request this code, please ignore this email.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
                    <p style="color: #666; font-size: 12px;">
                        This is an automated email. Please do not reply to this message.
                    </p>
                </div>
            `
        };

        const result = await transport.sendMail(mailOptions);
        console.log(`Email sent to ${email}: ${result.messageId}`);
        return result;

    }catch(error){
        console.error("Error sending email:", error);
        throw error;
    }
}

/**
 * Mock email service for development/testing
 */

const sendMockEmail = async (email, accessCode) => {
    console.log(`\nMOCK EMAIL SENT:`);
    console.log(`To: ${email}`);
    console.log(`Access Code: ${accessCode}`);
    console.log(`Expires in: 5 minutes`);
    console.log(`───────────────────────────────\n`);
    
    // Simulate email delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
        messageId: `mock_${Date.now()}`,
        status: 'sent',
        to: email,
        accessCode: accessCode
    };
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
    initEmailService,
    // Legacy exports for backward compatibility
    transport: transporter,
    sendAccessCodeEmail
};