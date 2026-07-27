import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class CommerceRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------
  // ENROLLMENTS & ACCESS
  // ------------------------------------------------------
  async getEnrollment(userId: string, courseId: string) {
    return this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });
  }

  async createEnrollment(data: any) {
    return this.prisma.enrollment.create({ data });
  }

  async updateEnrollment(userId: string, courseId: string, data: any) {
    return this.prisma.enrollment.update({
      where: { userId_courseId: { userId, courseId } },
      data,
    });
  }

  // ------------------------------------------------------
  // CART
  // ------------------------------------------------------
  async getCart(userId: string) {
    return this.prisma.cart.findUnique({
      where: { userId },
      include: { items: true },
    });
  }

  // ------------------------------------------------------
  // ORDERS
  // ------------------------------------------------------
  async createOrder(data: any) {
    return this.prisma.order.create({
      data,
      include: { items: true, invoice: true },
    });
  }

  // ------------------------------------------------------
  // COUPONS
  // ------------------------------------------------------
  async getCoupon(code: string) {
    return this.prisma.coupon.findUnique({ where: { code } });
  }
}
