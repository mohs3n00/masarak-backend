import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { AuthController } from './auth.controller';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';
import { SessionService } from './services/session.service';
import { OtpService } from './services/otp.service';
import { AuditService } from './services/audit.service';
import { SuperAdminBootstrapService } from './services/super-admin-bootstrap.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';

import { EmailModule } from '../email/email.module';
import { VerificationModule } from '../verification/verification.module';

@Module({
  imports: [JwtModule.register({}), ConfigModule, EmailModule, VerificationModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
    SessionService,
    OtpService,
    AuditService,
    SuperAdminBootstrapService,
    JwtStrategy,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
