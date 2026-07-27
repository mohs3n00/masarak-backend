import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class TeacherApprovedGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== 'TEACHER') {
      return true; // Not a teacher, let role guards handle access
    }

    const teacherProfile = await this.prisma.teacherProfile.findUnique({
      where: { userId: user.id },
      select: { verificationStatus: true },
    });

    if (teacherProfile?.verificationStatus !== 'APPROVED') {
      throw new ForbiddenException('حسابك قيد المراجعة. لا يمكنك القيام بهذا الإجراء حالياً.');
    }

    return true;
  }
}
