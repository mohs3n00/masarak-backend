import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CommerceRepository } from '../../commerce/commerce.repository';
import { AccessService } from '../../commerce/services/access.service';
import { PaymobService } from './paymob.service';

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commerceRepo: CommerceRepository,
    private readonly accessService: AccessService,
    private readonly paymobService: PaymobService,
  ) {}

  async checkoutCourse(userId: string, courseId: string) {
    // 1. Get User and Course
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const course = await this.prisma.course.findUnique({ where: { id: courseId } });
    if (!course) throw new NotFoundException('Course not found');

    // 2. Check if already enrolled
    const existingEnrollment = await this.commerceRepo.getEnrollment(userId, courseId);
    if (existingEnrollment && existingEnrollment.status === 'ACTIVE') {
      throw new BadRequestException('User is already enrolled in this course.');
    }

    // 3. Create Order
    const order = await this.commerceRepo.createOrder({
      userId,
      totalAmount: course.price,
      netAmount: course.price,
      currency: 'EGP', // Or SAR depending on platform
      status: 'PENDING',
      items: {
        create: [
          {
            courseId,
            price: course.price,
          },
        ],
      },
    });

    // 4. Create Payment
    const payment = await this.prisma.payment.create({
      data: {
        studentId: userId,
        courseId,
        amount: course.price,
        currency: 'EGP',
        status: 'PENDING',
      },
    });

    // 5. Initialize Paymob
    const clientSecret = await this.paymobService.createIntention(
      course.price,
      'EGP',
      payment.id, // special_reference
      {
        first_name: user.firstName || 'Student',
        last_name: user.lastName || 'Name',
        email: user.email || 'no-email@masarak.com',
        phone_number: user.phone || '+201000000000',
      },
    );

    return {
      clientSecret,
      paymentId: payment.id,
      orderId: order.id,
    };
  }

  async processWebhook(payload: any, hmac: string) {
    // Verify HMAC
    const isValid = this.paymobService.verifyWebhookHmac(payload, hmac);
    if (!isValid) {
      throw new BadRequestException('Invalid HMAC signature');
    }

    const obj = payload.obj || payload;
    const specialReference = obj.special_reference;
    
    // Sometimes Intention API doesn't pass special_reference directly in transaction object,
    // It might be in order.merchant_order_id
    const merchantOrderId = obj.order?.merchant_order_id || specialReference;

    if (!merchantOrderId) {
      // Nothing we can do
      return { status: 'ignored', reason: 'no special_reference or merchant_order_id' };
    }

    const payment = await this.prisma.payment.findUnique({ where: { id: merchantOrderId } });
    if (!payment) {
      return { status: 'ignored', reason: 'Payment not found' };
    }

    if (payment.status === 'COMPLETED') {
      return { status: 'ignored', reason: 'Payment already completed' };
    }

    // Is it successful?
    const isSuccess = obj.success === true && obj.pending === false;

    if (isSuccess) {
      // Update Payment
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: 'COMPLETED',
          providerId: obj.id?.toString(),
        },
      });

      // Update related Order to COMPLETED if needed
      // Find the pending order for this user/course
      const orderItem = await this.prisma.orderItem.findFirst({
        where: { courseId: payment.courseId!, order: { userId: payment.studentId, status: 'PENDING' } },
        include: { order: true },
        orderBy: { order: { createdAt: 'desc' } },
      });

      if (orderItem) {
        await this.prisma.order.update({
          where: { id: orderItem.orderId },
          data: { status: 'COMPLETED' },
        });
      }

      // Grant Access
      if (payment.courseId) {
        await this.accessService.grantCourseAccess(payment.studentId, payment.courseId, 'PURCHASE');
      }

      return { status: 'processed', action: 'completed' };
    } else if (obj.success === false) {
      // Update Payment to FAILED
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: 'FAILED', providerId: obj.id?.toString() },
      });

      return { status: 'processed', action: 'failed' };
    }

    return { status: 'ignored', reason: 'unknown status' };
  }
}
