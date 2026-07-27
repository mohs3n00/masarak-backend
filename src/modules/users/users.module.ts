import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UsersRepository } from './users.repository';
import { UserNotificationsListener } from './events/user-notifications.listener';
import { StorageModule } from '../../shared/storage/storage.module';

@Module({
  imports: [StorageModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository, UserNotificationsListener],
  exports: [UsersService, UsersRepository],
})
export class UsersModule {}
