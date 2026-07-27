import { Injectable, OnModuleInit } from '@nestjs/common';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

@Injectable()
export class FirebaseService implements OnModuleInit {
  onModuleInit() {
    if (getApps().length === 0) {
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

      if (projectId && clientEmail && privateKey) {
        initializeApp({
          credential: cert({
            projectId,
            clientEmail,
            privateKey,
          }),
        });
      } else {
        initializeApp({
          projectId,
        });
      }
    }
  }

  async verifyIdToken(idToken: string): Promise<any> {
    try {
      const decodedToken = await getAuth().verifyIdToken(idToken);
      return decodedToken;
    } catch (error) {
      throw new Error('Invalid Firebase Token');
    }
  }
}
