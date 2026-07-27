import { Injectable } from '@nestjs/common';
import { CommerceRepository } from '../commerce.repository';

@Injectable()
export class AccessService {
  constructor(private readonly repo: CommerceRepository) {}

  /**
   * Universal Access Engine. No other module should query permissions.
   * Returns true if user has active, unexpired access to the course.
   */
  async canAccessCourse(userId: string, courseId: string): Promise<boolean> {
    const enrollment = await this.repo.getEnrollment(userId, courseId);

    if (!enrollment) return false;

    if (enrollment.status !== 'ACTIVE') return false;

    // Check expiration if it's a subscription or limited access
    if (enrollment.validUntil && new Date() > enrollment.validUntil) {
      return false;
    }

    return true;
  }

  async grantCourseAccess(userId: string, courseId: string, accessGrantedBy: 'PURCHASE' | 'FREE' | 'GIFT' | 'INVITATION' | 'ADMIN_GRANT' | 'SUBSCRIPTION' = 'PURCHASE') {
    const existing = await this.repo.getEnrollment(userId, courseId);
    if (existing) {
      if (existing.status !== 'ACTIVE') {
        // Reactivate
        await this.repo.updateEnrollment(userId, courseId, {
          status: 'ACTIVE',
          accessGrantedBy,
        });
      }
      return existing;
    }

    return this.repo.createEnrollment({
      userId,
      courseId,
      status: 'ACTIVE',
      accessGrantedBy,
    });
  }
}
