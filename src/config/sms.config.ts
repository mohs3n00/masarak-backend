import { registerAs } from '@nestjs/config';

export const smsConfig = registerAs('sms', () => ({
  twilio: {
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    phoneNumber: process.env.TWILIO_PHONE_NUMBER,
  },
  unifonic: {
    appSid: process.env.UNIFONIC_APP_SID,
    senderId: process.env.UNIFONIC_SENDER_ID,
  },
  infobip: {
    baseUrl: process.env.INFOBIP_BASE_URL,
    apiKey: process.env.INFOBIP_API_KEY,
    sender: process.env.INFOBIP_SENDER,
  },
}));
