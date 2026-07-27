import {
  Controller,
  Post,
  Body,
  UseGuards,
  Req,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CourseStatus } from '@prisma/client';

@ApiTags('Student Checkout')
@Controller('student/checkout')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('STUDENT')
@ApiBearerAuth()
export class CheckoutController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('apply-coupon')
  @ApiOperation({ summary: 'Validate a coupon code for a specific course' })
  async applyCoupon(
    @Req() req: any,
    @Body() data: { courseId: string; code: string }
  ) {
    const course = await this.prisma.course.findUnique({
      where: { id: data.courseId, status: CourseStatus.PUBLISHED }
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    const coupon = await this.prisma.coupon.findUnique({
      where: { code: data.code.toUpperCase() }
    });

    if (!coupon || !coupon.isActive) {
      throw new BadRequestException('Invalid or expired coupon code');
    }

    if (coupon.courseId && coupon.courseId !== course.id) {
      throw new BadRequestException('This coupon is not valid for this course');
    }

    if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    if (new Date() < coupon.validFrom) {
      throw new BadRequestException('Coupon is not yet active');
    }

    if (coupon.validUntil && new Date() > coupon.validUntil) {
      throw new BadRequestException('Coupon has expired');
    }

    let finalPrice = course.price;
    let discountAmount = 0;

    if (coupon.type === 'PERCENTAGE') {
      discountAmount = course.price * (coupon.value / 100);
      finalPrice = course.price - discountAmount;
    } else {
      discountAmount = coupon.value;
      finalPrice = course.price - discountAmount;
    }

    if (finalPrice < 0) finalPrice = 0;

    return {
      success: true,
      isValid: true,
      is_valid: true,
      coupon: {
        code: coupon.code,
        type: coupon.type,
        value: coupon.value
      },
      originalPrice: course.price,
      discountAmount,
      discount: discountAmount,
      finalPrice,
      newPrice: finalPrice,
      new_price: finalPrice
    };
  }

  @Post('enroll')
  @ApiOperation({ summary: 'Enroll in a course (for free courses or 100% discount coupons)' })
  async enroll(
    @Req() req: any,
    @Body() data: { courseId: string; couponCode?: string }
  ) {
    const userId = req.user.id;

    // Check if already enrolled
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId: data.courseId }
      }
    });

    if (existingEnrollment) {
      throw new BadRequestException('You are already enrolled in this course');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: data.courseId, status: CourseStatus.PUBLISHED }
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    let finalPrice = course.price;
    let usedCoupon = null;

    // Validate coupon if provided
    if (data.couponCode) {
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: data.couponCode.toUpperCase() }
      });

      if (!coupon || !coupon.isActive || (coupon.courseId && coupon.courseId !== course.id)) {
        throw new BadRequestException('Invalid coupon code');
      }

      if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
        throw new BadRequestException('Coupon usage limit reached');
      }

      if (coupon.validUntil && new Date() > coupon.validUntil) {
        throw new BadRequestException('Coupon has expired');
      }

      if (coupon.type === 'PERCENTAGE') {
        finalPrice -= course.price * (coupon.value / 100);
      } else {
        finalPrice -= coupon.value;
      }

      usedCoupon = coupon;
    }

    if (finalPrice < 0) finalPrice = 0;

    // If it's not free and the final price isn't 0, student cannot enroll without 100% coupon
    if (finalPrice > 0.01) {
      throw new BadRequestException('يجب استخدام كود خصم 100% من معلمك للالتحاق بهذا الكورس لحين توفر بوابة الدفع الإلكتروني');
    }

    // Process enrollment
    await this.prisma.$transaction(async (tx) => {
      // ✅ Atomic coupon check: تحديث مع التحقق الذري من الحد الأقصى (يمنع Race Condition)
      if (usedCoupon) {
        const updated = await tx.coupon.updateMany({
          where: {
            id: usedCoupon.id,
            isActive: true,
            ...(usedCoupon.maxUses !== null && {
              usedCount: { lt: usedCoupon.maxUses }
            }),
          },
          data: { usedCount: { increment: 1 } },
        });

        if (updated.count === 0) {
          throw new BadRequestException('Coupon usage limit has been reached or coupon is no longer valid');
        }
      }

      // Create Enrollment
      await tx.enrollment.create({
        data: {
          userId,
          courseId: course.id,
          accessGrantedBy: usedCoupon ? 'GIFT' : (course.price === 0 ? 'FREE' : 'PURCHASE'),
          status: 'ACTIVE'
        }
      });
    });

    return { success: true, message: 'Enrolled successfully' };
  }
}

