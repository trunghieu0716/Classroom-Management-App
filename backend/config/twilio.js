const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE;

if (!accountSid || !authToken || !twilioPhoneNumber) {
    console.error("Missing Twilio configuration");
    console.error("TWILIO_ACCOUNT_SID:", accountSid ? "✓" : "✗");
    console.error("TWILIO_AUTH_TOKEN:", authToken ? "✓" : "✗");
    console.error("TWILIO_PHONE:", twilioPhoneNumber ? "✓" : "✗");
    console.error("⚠️ Twilio not configured - SMS will use development mode");
    // throw new Error("Twilio configuration is incomplete. Please set the environment variables.");
}

const client = twilio(accountSid, authToken);

/**
 * send sms otp code
 * @param {string} phoneNumber 
 * @param {string} otpCode 
 * @returns {Promise} 
 */

const sendOTP = async (phoneNumber, otpCode) => {
    try {
        console.log(`Sending OTP to ${phoneNumber}`);

        const message = await client.messages.create({
            body: `Your OTP code is: ${otpCode}. It will expire in 5 minutes.`, 
            from: twilioPhoneNumber,
            to: phoneNumber
    });

    console.log(`SMS sent to ${phoneNumber}: ${message.sid}`);
    return message;
    } catch (error) {
        console.error('Error sending SMS:', error);
        console.error('Error code:', error.code);
        console.error('Error status:', error.status);
    }
}

/**
 * Format phone number to international format
 * @param {string} phoneNumber - Phone number to format
 * @returns {string} - Formatted phone number
 */

const formatPhoneNumber = (phoneNumber) => {
    //remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, '');

    console.log(`Original phone number: ${phoneNumber}, Cleaned: ${cleaned}`);

    //handle vietnamese phone numbers
    if (cleaned.length === 10 && cleaned.startsWith('0')) {
        //remove leading 0 and add +84
        cleaned = '+84' + cleaned.substring(1);
    } else if (cleaned.length === 9 && !cleaned.startsWith('84')) {
        //add +84 in front
        cleaned = '+84' + cleaned;
    } else if (cleaned.length === 11 && cleaned.startsWith('84')) {
        cleaned = '+' + cleaned;
    } else if (cleaned.length === 12 && cleaned.startsWith('84')) {
        //handle case where number already has country code
        cleaned = '+84' + cleaned.substring(4);
    } else if (!cleaned.startsWith('+')) {
        //add + in front if missing
        cleaned = '+' + cleaned;
    }

    console.log(`Formatted phone number: ${cleaned}`);

    //validate final format
    if (!cleaned.match(/^\+84[0-9]{9}$/)) {
        console.warn(`Phone number might not be in correct Vietnamese format: ${cleaned}`);
    }
    
    return cleaned;
    // if (cleaned.length === 10 && cleaned.startsWith('0')) {
    //     cleaned = '84' + cleaned.substring(1);
    // } else if (cleaned.length === 9) {
    //     cleaned = '84' + cleaned;
    // }

    // return '84' + cleaned;
}
/**
 * Mock SMS service for development/testing
 */
const sendMockOTP = async (phoneNumber, otpCode) => {
    console.log(`\n📱 MOCK SMS SENT:`);
    console.log(`To: ${phoneNumber}`);
    console.log(`🔑 OTP Code: ${otpCode}`);
    console.log(`⏰ Expires in: 5 minutes`);
    console.log(`───────────────────────────────\n`);
    
    // Simulate SMS delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return {
        sid: `mock_${Date.now()}`,
        status: 'sent',
        to: phoneNumber,
        from: twilioPhoneNumber,
        body: `Your Classroom Management verification code is: ${otpCode}. This code will expire in 5 minutes.`
    };
};


module.exports = {
    client,
    sendOTP,
    formatPhoneNumber,
    twilioPhoneNumber,
    sendMockOTP
};