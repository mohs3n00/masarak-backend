import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Session } from '@prisma/client';

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  async createSession(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
    fcmToken?: string,
  ): Promise<Session> {
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);
    const expiresInStr =
      this.configService.get<string>('auth.jwtRefreshExpiresIn') || '7d';
    // Simple parser for days to calculate Date
    const days = parseInt(expiresInStr.replace('d', ''), 10);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + (isNaN(days) ? 7 : days));

    return this.prisma.session.create({
      data: {
        userId,
        hashedRefreshToken,
        ipAddress,
        deviceFingerprint: userAgent,
        fcmToken,
        expiresAt,
      },
    });
  }

  async validateAndRotateSession(
    sessionId: string,
    oldRefreshToken: string,
    newRefreshToken: string,
  ): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session expired or invalid');
    }

    const isTokenMatching = await bcrypt.compare(
      oldRefreshToken,
      session.hashedRefreshToken,
    );
    if (!isTokenMatching) {
      // Possible token reuse detected
      await this.revokeAllUserSessions(session.userId);
      throw new UnauthorizedException(
        'Invalid session token. All sessions revoked for security.',
      );
    }

    const hashedRefreshToken = await bcrypt.hash(newRefreshToken, 10);
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { hashedRefreshToken },
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.prisma.session
      .delete({ where: { id: sessionId } })
      .catch(() => null);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  async updateFcmToken(sessionId: string, fcmToken: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { fcmToken },
    });
  }
}
