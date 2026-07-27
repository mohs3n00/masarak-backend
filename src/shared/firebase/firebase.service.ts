import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getMessaging, Messaging } from 'firebase-admin/messaging';
import { getAuth, Auth, DecodedIdToken } from 'firebase-admin/auth';

@Injectable()
export class FirebaseService implements OnModuleInit {
  private readonly logger = new Logger(FirebaseService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const projectId = this.configService.get<string>('firebase.projectId');
    const clientEmail = this.configService.get<string>('firebase.clientEmail');
    // Replace literal '\n' with actual newlines in private key if loaded from env string
    let privateKey = this.configService.get<string>('firebase.privateKey');
    if (privateKey) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }

    if (!projectId) {
      this.logger.warn(
        'Firebase projectId missing. Firebase Admin SDK not initialized.',
      );
      return;
    }

    try {
      if (!getApps().length) {
        if (clientEmail && privateKey) {
          initializeApp({
            credential: cert({
              projectId,
              clientEmail,
              privateKey,
            }),
          });
          this.logger.log(
            'Firebase Admin SDK initialized with full credentials',
          );
        } else {
          initializeApp({
            projectId,
          });
          this.logger.log(
            'Firebase Admin SDK initialized with projectId only (Token Verification mode)',
          );
        }
      }
    } catch (error: any) {
      this.logger.error('Error initializing Firebase Admin SDK', error.stack);
    }
  }

  getMessaging(): Messaging {
    if (!getApps().length) {
      throw new Error('Firebase app not initialized');
    }
    return getMessaging();
  }

  getAuth(): Auth {
    if (!getApps().length) {
      throw new Error('Firebase app not initialized');
    }
    return getAuth();
  }

  async verifyIdToken(idToken: string): Promise<DecodedIdToken> {
    try {
      return await this.getAuth().verifyIdToken(idToken);
    } catch (error) {
      this.logger.error('Error verifying Firebase ID token', error);
      throw new Error('Invalid or expired Firebase ID token');
    }
  }
}
