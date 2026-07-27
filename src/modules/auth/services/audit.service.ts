import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { AuditAction } from '@prisma/client';

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async logAction(
    userId: string,
    action: AuditAction,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<void> {
    await this.prisma.auditLog
      .create({
        data: {
          userId,
          action,
          ipAddress,
          userAgent,
        },
      })
      .catch(() => null); // Fail silently for audit logs to not disrupt main flow
  }
}
