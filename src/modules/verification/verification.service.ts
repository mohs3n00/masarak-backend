import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';
import * as argon2 from 'argon2';
import { OtpType } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class VerificationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Generates a secure 6-digit OTP, hashes it, and stores it in the database.
   * Enforces a 60-second cooldown before a new OTP can be generated.
   */
  async generateResetCode(userId: string): Promise<string> {
    // 1. Check for existing active OTP within the cooldown period (60 seconds)
    const recentOtp = await this.prisma.otp.findFirst({
      where: {
        userId,
        type: OtpType.PASSWORD_RESET,
        createdAt: { gte: new Date(Date.now() - 60 * 1000) },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (recentOtp) {
      throw new BadRequestException('Please wait 60 seconds before requesting a new code.');
    }

    // 2. Invalidate all previous reset codes for this user
    await this.prisma.otp.updateMany({
      where: {
        userId,
        type: OtpType.PASSWORD_RESET,
        used: false,
      },
      data: { used: true },
    });

    // 3. Generate a secure 6-digit code
    const code = crypto.randomInt(100000, 999999).toString();

    // 4. Hash the code
    const hashedCode = await argon2.hash(code);

    // 5. Store in the database with 5 minutes expiration
    await this.prisma.otp.create({
      data: {
        userId,
        code: hashedCode,
        type: OtpType.PASSWORD_RESET,
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      },
    });

    return code;
  }

  /**
   * Verifies the provided reset code for the user.
   * Enforces 5 minutes expiration and a maximum of 5 attempts.
   */
  async verifyResetCode(userId: string, code: string): Promise<boolean> {
    const otp = await this.prisma.otp.findFirst({
      where: {
        userId,
        type: OtpType.PASSWORD_RESET,
        used: false,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException('Invalid or expired code.');
    }

    if (otp.expiresAt < new Date()) {
      throw new BadRequestException('Code has expired.');
    }

    if (otp.attempts >= 5) {
      throw new BadRequestException('Too many failed attempts. Please request a new code.');
    }

    const isMatch = await argon2.verify(otp.code, code);

    if (!isMatch) {
      // Increment attempts
      await this.prisma.otp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid code.');
    }

    // Don't mark as used yet; it will be marked as used when the password is actually reset.
    // However, the request asked to "Verify OTP -> If valid, allow user to create new password".
    // We will just return true if it's valid, and we will do this exact same check again during the actual password reset.
    return true;
  }

  /**
   * Marks the OTP as used. Called after successful password reset.
   */
  async markAsUsed(userId: string): Promise<void> {
    await this.prisma.otp.updateMany({
      where: {
        userId,
        type: OtpType.PASSWORD_RESET,
        used: false,
      },
      data: { used: true },
    });
  }
}
