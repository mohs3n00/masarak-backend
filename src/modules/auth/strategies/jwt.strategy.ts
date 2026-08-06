import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../services/token.service';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CacheService } from '../../../shared/cache/cache.service';

import { Request } from 'express';

const cookieExtractor = (req: Request) => {
  let token = null;
  if (req && req.cookies) {
    token = req.cookies['accessToken'];
  }
  return token;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cacheService: CacheService,
  ) {
    const secret =
      configService.get<string>('auth.jwtAccessSecret') ||
      process.env.JWT_ACCESS_SECRET ||
      process.env.JWT_SECRET ||
      'masarak_default_secure_jwt_access_secret_key_2026_prod';

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromAuthHeaderAsBearerToken(),
        cookieExtractor,
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: JwtPayload) {
    if (!payload.sub || !payload.sessionId) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const userCacheKey = `auth_user:${payload.sub}`;
    let user = await this.cacheService.get<{ isActive: boolean; role: string; id: string }>(userCacheKey);

    if (!user) {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: { id: true, isActive: true, role: true },
      });
      if (dbUser) {
        user = dbUser;
        // Cache user state for 1 hour (3600000 ms)
        await this.cacheService.set(userCacheKey, user, 3600000);
      }
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedException('User is suspended or deleted');
    }

    const sessionCacheKey = `auth_session:${payload.sessionId}`;
    let isSessionValid = await this.cacheService.get<boolean>(sessionCacheKey);

    if (isSessionValid === undefined || isSessionValid === null) {
      const dbSession = await this.prisma.session.findUnique({
        where: { id: payload.sessionId },
      });
      isSessionValid = !!dbSession;
      await this.cacheService.set(sessionCacheKey, isSessionValid, 3600000);
    }

    if (!isSessionValid) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    // Payload properties match the user object attached to Request
    return {
      id: user.id,
      phone: payload.phone,
      role: user.role,
      sessionId: payload.sessionId,
    };
  }
}
