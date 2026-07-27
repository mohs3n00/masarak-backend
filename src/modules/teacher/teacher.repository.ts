import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class TeacherRepository {
  constructor(private readonly prisma: PrismaService) {}

  async getWallet(teacherId: string) {
    return this.prisma.teacherWallet.findUnique({
      where: { teacherId },
    });
  }

  async creditWallet(teacherId: string, amount: number) {
    return this.prisma.teacherWallet.update({
      where: { teacherId },
      data: {
        availableBalance: { increment: amount },
        totalEarned: { increment: amount },
      },
    });
  }
}
