import { Controller, Post, Body, Req, UseGuards, Get, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PaymentsService } from './services/payments.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { PrismaService } from '../../database/prisma/prisma.service';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('checkout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Initialize checkout for a course' })
  async checkout(@Req() req: any, @Body('courseId') courseId: string) {
    return this.paymentsService.checkoutCourse(req.user.id, courseId);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get payment history' })
  async getHistory(@Req() req: any) {
    if (req.user.role === 'STUDENT') {
      return this.prisma.payment.findMany({
        where: { studentId: req.user.id },
        include: { student: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } else if (req.user.role === 'TEACHER') {
      // Teachers can only see payments for their courses
      const teacherProfile = await this.prisma.teacherProfile.findUnique({ where: { userId: req.user.id } });
      if (!teacherProfile) throw new ForbiddenException();
      
      const courses = await this.prisma.courseInstructor.findMany({
        where: { teacherId: teacherProfile.id },
        select: { courseId: true },
      });
      const courseIds = courses.map((c) => c.courseId);

      return this.prisma.payment.findMany({
        where: { courseId: { in: courseIds } },
        include: { student: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    } else if (req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN') {
      return this.prisma.payment.findMany({
        include: { student: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
      });
    }

    throw new ForbiddenException();
  }
}
