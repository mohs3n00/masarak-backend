const { initializeApp, cert } = require('firebase-admin/app');
const { getMessaging } = require('firebase-admin/messaging');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

const getPrivateKey = () => {
  const pk = process.env.FIREBASE_PRIVATE_KEY;
  if (pk && !pk.includes('...')) {
    return pk.replace(/\\n/g, '\n');
  }
  const parts = [
    process.env.FIREBASE_PRIVATE_KEY_1,
    process.env.FIREBASE_PRIVATE_KEY_2,
    process.env.FIREBASE_PRIVATE_KEY_3,
    process.env.FIREBASE_PRIVATE_KEY_4,
  ];
  const combined = parts.filter(Boolean).join('');
  return combined ? combined.replace(/\\n/g, '\n') : undefined;
};

const privateKey = getPrivateKey();

if (!projectId || !clientEmail || !privateKey) {
  console.error('Error: Firebase config variables are missing from .env');
  console.log('FIREBASE_PROJECT_ID:', projectId);
  console.log('FIREBASE_CLIENT_EMAIL:', clientEmail);
  console.log('FIREBASE_PRIVATE_KEY exists:', !!privateKey);
  process.exit(1);
}

let app;
try {
  app = initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  console.log('Firebase Admin SDK initialized successfully.');
} catch (error) {
  console.error('Initialization error:', error);
  process.exit(1);
}

const fcmToken = 'dZLNkrDzRd2N6F93PYnqqf:APA91bEBgfX3Y_wQGzbRoXGjVpE9KTmp8ZtmD93EDNX04aYjjf9BAh9IomW2f3qLpBEIN7x4yRWoVa8HTXI17Le83Y_B6aoILkQRH0YII3-XfkgO2BJMKF0';

const message = {
  token: fcmToken,
  notification: {
    title: 'تنبيه تجريبي مباشر',
    body: 'هذا إشعار تجريبي مرسل من خادم التشخيص مباشرة!',
  },
  android: {
    priority: 'high',
    notification: {
      channelId: 'masarak_alerts_v3',
      sound: 'default',
    },
  },
};

console.log('Sending message to token:', fcmToken);

const messaging = getMessaging(app);
messaging.send(message)
  .then((response) => {
    console.log('Successfully sent message:', response);
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error sending message:', error);
    process.exit(1);
  });
