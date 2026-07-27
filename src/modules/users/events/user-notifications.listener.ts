import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  UserCreatedEvent,
  ProfileUpdatedEvent,
  AvatarUpdatedEvent,
  SettingsChangedEvent,
  EmailChangedEvent,
  PhoneChangedEvent,
  AccountDeletedEvent,
} from './user-events';

@Injectable()
export class UserNotificationsListener {
  private readonly logger = new Logger(UserNotificationsListener.name);

  @OnEvent('user.created')
  handleUserCreatedEvent(event: UserCreatedEvent) {
    this.logger.log(`User created: ${event.userId}`);
    // Future: Integrate with NotificationService to send welcome email
  }

  @OnEvent('user.profile.updated')
  handleProfileUpdatedEvent(event: ProfileUpdatedEvent) {
    this.logger.log(`Profile updated for user: ${event.userId}`);
  }

  @OnEvent('user.avatar.updated')
  handleAvatarUpdatedEvent(event: AvatarUpdatedEvent) {
    this.logger.log(`Avatar updated for user: ${event.userId}`);
  }

  @OnEvent('user.settings.changed')
  handleSettingsChangedEvent(event: SettingsChangedEvent) {
    this.logger.log(
      `Settings (${event.type}) changed for user: ${event.userId}`,
    );
  }

  @OnEvent('user.email.changed')
  handleEmailChangedEvent(event: EmailChangedEvent) {
    this.logger.log(`Email changed for user: ${event.userId}`);
    // Future: Send verification email to new address
  }

  @OnEvent('user.phone.changed')
  handlePhoneChangedEvent(event: PhoneChangedEvent) {
    this.logger.log(`Phone changed for user: ${event.userId}`);
  }

  @OnEvent('user.account.deleted')
  handleAccountDeletedEvent(event: AccountDeletedEvent) {
    this.logger.log(`Account deleted for user: ${event.userId}`);
  }
}
