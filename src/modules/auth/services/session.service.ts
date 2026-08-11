import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import * as argon2 from 'argon2';
import { Session } from '@prisma/client';
import { CacheService } from '../../../shared/cache/cache.service';

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 32768,
  timeCost: 2,
  parallelism: 1,
};

@Injectable()
export class SessionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly cacheService: CacheService,
  ) {}

  async createSession(
    userId: string,
    refreshToken: string,
    ipAddress?: string,
    userAgent?: string,
    fcmToken?: string,
  ): Promise<Session> {
    const hashedRefreshToken = await argon2.hash(refreshToken, ARGON2_OPTIONS);
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

    let isTokenMatching = false;
    try {
      isTokenMatching = await argon2.verify(
        session.hashedRefreshToken,
        oldRefreshToken,
      );
    } catch {
      // Verification failed
    }
    
    if (!isTokenMatching) {
      // Possible token reuse detected
      await this.revokeAllUserSessions(session.userId);
      throw new UnauthorizedException(
        'Invalid session token. All sessions revoked for security.',
      );
    }

    const hashedRefreshToken = await argon2.hash(newRefreshToken, ARGON2_OPTIONS);
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { hashedRefreshToken },
    });
  }

  async revokeSession(sessionId: string): Promise<void> {
    await this.cacheService.del(`auth_session:${sessionId}`);
    await this.prisma.session
      .delete({ where: { id: sessionId } })
      .catch(() => null);
  }

  async revokeAllUserSessions(userId: string): Promise<void> {
    const sessions = await this.prisma.session.findMany({ where: { userId }, select: { id: true } });
    await this.prisma.session.deleteMany({ where: { userId } });
    
    // Invalidate Redis caches for all wiped sessions to terminate access immediately
    for (const session of sessions) {
      await this.cacheService.del(`auth_session:${session.id}`);
    }
  }

  async updateFcmToken(sessionId: string, fcmToken: string): Promise<void> {
    await this.prisma.session.update({
      where: { id: sessionId },
      data: { fcmToken },
    });
  }
}
