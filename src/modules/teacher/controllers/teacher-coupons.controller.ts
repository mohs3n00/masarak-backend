import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CouponType } from '@prisma/client';

@ApiTags('Teacher Coupons')
@Controller('teacher/coupons')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('TEACHER')
@ApiBearerAuth()
export class TeacherCouponsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all coupons for courses owned by the teacher' })
  async getCoupons(@Req() req: any) {
    const userId = req.user.id;

    // Get teacher profile
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { name: true } },
        courseInstructors: {
          where: { isOwner: true },
          select: { courseId: true }
        }
      }
    });

    if (!teacher) {
      throw new NotFoundException('Teacher profile not found');
    }

    const courseIds = teacher.courseInstructors.map(ci => ci.courseId);

    const coupons = await this.prisma.coupon.findMany({
      where: {
        courseId: { in: courseIds }
      },
      include: {
        course: { select: { id: true, title: true, price: true } }
      },
      orderBy: { validFrom: 'desc' }
    });

    return coupons.map(coupon => ({
      ...coupon,
      teacherName: teacher.user?.name || 'المعلم',
    }));
  }

  private generateRandomCode(prefix = 'MSK'): string {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude ambiguous 0, O, 1, I
    let code = `${prefix}-`;
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  @Post('generate')
  @ApiOperation({ summary: 'Generate coupons with 3 modes (SINGLE_STUDENT, BATCH_SINGLE_USE, MULTI_USE)' })
  async generateCoupons(
    @Req() req: any,
    @Body() data: {
      courseId: string;
      mode: 'SINGLE_STUDENT' | 'BATCH_SINGLE_USE' | 'MULTI_USE';
      type?: CouponType;
      value?: number;
      count?: number; // Used for BATCH count or MULTI_USE maxUses
      validFrom?: Date;
      validUntil?: Date;
      customCode?: string;
    }
  ) {
    const userId = req.user.id;

    // Verify teacher profile and course ownership
    const teacher = await this.prisma.teacherProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { name: true } },
        courseInstructors: {
          where: { courseId: data.courseId, isOwner: true }
        }
      }
    });

    if (!teacher || !teacher.courseInstructors.length) {
      throw new ForbiddenException('You do not have permission to create coupons for this course');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: data.courseId },
      select: { id: true, title: true, price: true }
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const couponType = data.type || CouponType.PERCENTAGE;
    const couponValue = data.value !== undefined ? data.value : 100; // Default 100% discount
    const validFromDate = data.validFrom ? new Date(data.validFrom) : new Date();
    const validUntilDate = data.validUntil ? new Date(data.validUntil) : null;
    const teacherName = teacher.user?.name || 'المعلم';

    const createdCoupons = [];

    if (data.mode === 'SINGLE_STUDENT') {
      let code = data.customCode ? data.customCode.toUpperCase() : this.generateRandomCode('MSK');
      let existing = await this.prisma.coupon.findUnique({ where: { code } });
      while (existing) {
        code = this.generateRandomCode('MSK');
        existing = await this.prisma.coupon.findUnique({ where: { code } });
      }

      const coupon = await this.prisma.coupon.create({
        data: {
          code,
          type: couponType,
          value: couponValue,
          maxUses: 1,
          validFrom: validFromDate,
          validUntil: validUntilDate,
          courseId: data.courseId,
          isActive: true,
        },
        include: { course: { select: { id: true, title: true, price: true } } }
      });
      createdCoupons.push({ ...coupon, teacherName });
    } else if (data.mode === 'BATCH_SINGLE_USE') {
      const batchSize = Math.min(Math.max(data.count || 10, 1), 100);
      const generatedCodes = new Set<string>();

      while (generatedCodes.size < batchSize) {
        const code = this.generateRandomCode('MSK');
        const existing = await this.prisma.coupon.findUnique({ where: { code } });
        if (!existing) {
          generatedCodes.add(code);
        }
      }

      for (const code of generatedCodes) {
        const coupon = await this.prisma.coupon.create({
          data: {
            code,
            type: couponType,
            value: couponValue,
            maxUses: 1,
            validFrom: validFromDate,
            validUntil: validUntilDate,
            courseId: data.courseId,
            isActive: true,
          },
          include: { course: { select: { id: true, title: true, price: true } } }
        });
        createdCoupons.push({ ...coupon, teacherName });
      }
    } else if (data.mode === 'MULTI_USE') {
      const maxUses = Math.max(data.count || 10, 1);
      let code = data.customCode ? data.customCode.toUpperCase() : this.generateRandomCode('MSK');
      let existing = await this.prisma.coupon.findUnique({ where: { code } });
      while (existing) {
        code = this.generateRandomCode('MSK');
        existing = await this.prisma.coupon.findUnique({ where: { code } });
      }

      const coupon = await this.prisma.coupon.create({
        data: {
          code,
          type: couponType,
          value: couponValue,
          maxUses,
          validFrom: validFromDate,
          validUntil: validUntilDate,
          courseId: data.courseId,
          isActive: true,
        },
        include: { course: { select: { id: true, title: true, price: true } } }
      });
      createdCoupons.push({ ...coupon, teacherName });
    } else {
      throw new BadRequestException('Invalid mode');
    }

    return {
      success: true,
      count: createdCoupons.length,
      coupons: createdCoupons
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new coupon for a course' })
  async createCoupon(
    @Req() req: any,
    @Body() data: {
      code?: string;
      courseId: string;
      type: CouponType;
      value: number;
      maxUses?: number;
      validFrom: Date;
      validUntil?: Date;
    }
  ) {
    const userId = req.user.id;

    // Verify teacher owns the course
    const isOwner = await this.prisma.courseInstructor.findFirst({
      where: {
        courseId: data.courseId,
        teacher: { userId },
        isOwner: true
      }
    });

    if (!isOwner) {
      throw new ForbiddenException('You do not have permission to create coupons for this course');
    }

    let code = data.code ? data.code.toUpperCase() : this.generateRandomCode('MSK');
    let existing = await this.prisma.coupon.findUnique({ where: { code } });
    if (data.code && existing) {
      throw new BadRequestException('Coupon code already exists');
    }
    while (existing) {
      code = this.generateRandomCode('MSK');
      existing = await this.prisma.coupon.findUnique({ where: { code } });
    }

    const coupon = await this.prisma.coupon.create({
      data: {
        code,
        type: data.type,
        value: data.value,
        maxUses: data.maxUses,
        validFrom: new Date(data.validFrom),
        validUntil: data.validUntil ? new Date(data.validUntil) : null,
        courseId: data.courseId,
        isActive: true,
      },
      include: {
        course: { select: { id: true, title: true, price: true } }
      }
    });

    return coupon;
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete or deactivate a coupon' })
  async deleteCoupon(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;

    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: {
        course: {
          include: {
            instructors: {
              where: { teacher: { userId }, isOwner: true }
            }
          }
        }
      }
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (!coupon.course?.instructors.length) {
      throw new ForbiddenException('You do not have permission to delete this coupon');
    }

    await this.prisma.coupon.delete({ where: { id } });

    return { success: true, message: 'Coupon deleted successfully' };
  }
}
