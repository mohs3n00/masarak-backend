import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';

@Injectable()
export class AcademicYearService {
  private readonly logger = new Logger(AcademicYearService.name);
  constructor(private readonly prisma: PrismaService) {}

  async promoteStudents(fromGrade: string, toGrade: string) {
    this.logger.log(`Promoting students from ${fromGrade} to ${toGrade}`);
    const result = await this.prisma.studentProfile.updateMany({
      where: { grade: fromGrade },
      data: { grade: toGrade },
    });
    return {
      message: `Promoted ${result.count} students from ${fromGrade} to ${toGrade}.`,
    };
  }

  async graduateStudents(grade: string) {
    this.logger.log(`Graduating students from grade ${grade}`);
    // Get all user IDs for students in this grade
    const students = await this.prisma.studentProfile.findMany({
      where: { grade },
      select: { userId: true },
    });

    const userIds = students.map((s) => s.userId);

    const result = await this.prisma.user.deleteMany({
      where: { id: { in: userIds } },
    });
    return {
      message: `Graduated and deleted ${result.count} students in grade ${grade}.`,
    };
  }

  async resetAllStudents() {
    this.logger.log('Resetting all student accounts');
    const result = await this.prisma.user.deleteMany({
      where: { role: 'STUDENT' },
    });
    return { message: `Deleted all ${result.count} students.` };
  }
}
