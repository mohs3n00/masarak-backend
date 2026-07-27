export interface SendNotificationOptions {
  userId: string;
  title: string;
  body: string;
  type?: 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'SYSTEM';
  data?: Record<string, string>;
}

export interface NotificationProvider {
  sendNotification(options: SendNotificationOptions): Promise<void>;
}
