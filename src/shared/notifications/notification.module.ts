import { Module, Global } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { DatabaseNotificationProvider } from './providers/database.provider';
import { FcmNotificationProvider } from './providers/fcm.provider';
import { FirebaseModule } from '../firebase/firebase.module';

@Global()
@Module({
  imports: [FirebaseModule],
  providers: [
    DatabaseNotificationProvider,
    FcmNotificationProvider,
    NotificationService,
  ],
  exports: [NotificationService],
})
export class NotificationModule {}
