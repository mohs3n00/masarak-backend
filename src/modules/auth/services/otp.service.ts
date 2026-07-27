import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { SmsService } from '../../../shared/sms/sms.service';
import { ConfigService } from '@nestjs/config';
import { OtpType } from '@prisma/client';

@Injectable()
export class OtpService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
    private readonly configService: ConfigService,
  ) {}

  async generateAndSendOtp(
    userId: string,
    target: string,
    type: OtpType,
  ): Promise<void> {
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresInMins =
      this.configService.get<number>('auth.otpExpiresIn') || 15;
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expiresInMins);

    // Invalidate previous active OTPs of the same type for this user
    await this.prisma.otp.updateMany({
      where: { userId, type, used: false },
      data: { used: true }, // Or delete them
    });

    await this.prisma.otp.create({
      data: {
        userId,
        code,
        type,
        expiresAt,
      },
    });

    // Send SMS for all verification requests
    await this.smsService.sendVerificationCode(target, code);
  }

  async verifyOtp(userId: string, code: string, type: OtpType): Promise<void> {
    const otp = await this.prisma.otp.findFirst({
      where: {
        userId,
        code,
        type,
        used: false,
      },
    });

    if (!otp) {
      throw new BadRequestException('Invalid OTP');
    }

    if (otp.expiresAt < new Date()) {
      throw new BadRequestException('OTP has expired');
    }

    await this.prisma.otp.update({
      where: { id: otp.id },
      data: { used: true },
    });
  }
}
