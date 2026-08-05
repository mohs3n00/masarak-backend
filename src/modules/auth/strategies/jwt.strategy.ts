import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtPayload } from '../services/token.service';
import { PrismaService } from '../../../database/prisma/prisma.service';

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

    const session = await this.prisma.session.findUnique({
      where: { id: payload.sessionId },
      select: {
        id: true,
        user: {
          select: {
            id: true,
            phone: true,
            role: true,
            isActive: true,
          },
        },
      },
    });

    if (!session || !session.user || !session.user.isActive) {
      throw new UnauthorizedException('Session expired or user deleted');
    }

    // Payload properties match the user object attached to Request
    return {
      id: session.user.id,
      phone: session.user.phone,
      role: session.user.role,
      sessionId: session.id,
    };
  }
}
