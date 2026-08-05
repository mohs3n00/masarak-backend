import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class MediaService {
  constructor(private readonly prisma: PrismaService) {}

  async processUpload(file: Express.Multer.File, userId: string) {
    // In production, uploads to S3/Cloudinary, then saves to Prisma `MediaAsset` for userId.
    return {
      url: 'https://cdn.masarak.com/placeholder.png',
      size: file.size,
      userId,
    };
  }

  async createPlaybackSession(userId: string, lessonId?: string, courseId?: string, originalMediaUrl?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        firstName: true,
        middleName: true,
        lastName: true,
        familyName: true,
        phone: true,
        email: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User account not found');
    }

    const fullName = user.name || [user.firstName, user.middleName, user.lastName, user.familyName].filter(Boolean).join(' ') || 'طالب مسارك';
    const shortId = user.id.replace(/[^A-Za-z0-9]/g, '').slice(-5).toUpperCase();
    const studentId = `ST-${shortId || '48291'}`;
    const phone = user.phone || '01000000000';

    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const rand = (len: number) => Array.from({ length: len }).map(() => chars[Math.floor(Math.random() * chars.length)]).join('');
    const sessionId = `${rand(4)}-${rand(4)}-${rand(3)}`;

    const playbackUrl = originalMediaUrl 
      ? `${originalMediaUrl}${originalMediaUrl.includes('?') ? '&' : '?'}sig=${rand(16).toLowerCase()}&exp=${Date.now() + 3600000}&session=${sessionId}`
      : `https://cdn.masarak.com/secure/${lessonId || 'video'}?sig=${rand(16).toLowerCase()}&session=${sessionId}`;

    return {
      sessionId,
      playbackUrl,
      expiresAt: Date.now() + 3600000,
      studentName: fullName,
      studentId,
      phone,
      email: user.email || null,
      courseId: courseId || null,
      lessonId: lessonId || null,
    };
  }
}
