import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma/prisma.service';

@Injectable()
export class StudentRepository {
  constructor(private readonly prisma: PrismaService) {}

  // ------------------------------------------------------
  // DASHBOARD & ANALYTICS
  // ------------------------------------------------------
  async getStudentStatistics(userId: string) {
    return this.prisma.studentStatistics.findUnique({ where: { userId } });
  }

  async incrementWatchTime(userId: string, seconds: number) {
    return this.prisma.studentStatistics.upsert({
      where: { userId },
      update: { totalSecondsWatched: { increment: seconds } },
      create: { userId, totalSecondsWatched: seconds },
    });
  }

  async incrementCompletedLessons(userId: string) {
    return this.prisma.studentStatistics.upsert({
      where: { userId },
      update: { completedLessons: { increment: 1 } },
      create: { userId, completedLessons: 1 },
    });
  }

  async getStreak(userId: string) {
    return this.prisma.studentStreak.findUnique({ where: { userId } });
  }

  async updateStreak(
    userId: string,
    currentStreak: number,
    longestStreak: number,
    date: Date,
  ) {
    return this.prisma.studentStreak.upsert({
      where: { userId },
      update: { currentStreak, longestStreak, lastStudyDate: date },
      create: { userId, currentStreak, longestStreak, lastStudyDate: date },
    });
  }

  // ------------------------------------------------------
  // LEARNING HISTORY
  // ------------------------------------------------------
  async startLearningSession(userId: string, device: any) {
    return this.prisma.learningSession.create({
      data: { userId, device },
    });
  }

  async endLearningSession(
    sessionId: string,
    endTime: Date,
    durationSeconds: number,
  ) {
    return this.prisma.learningSession.update({
      where: { id: sessionId },
      data: { endTime, durationSeconds },
    });
  }

  // ------------------------------------------------------
  // GAMIFICATION
  // ------------------------------------------------------
  async addAchievement(userId: string, badgeName: string, description: string) {
    return this.prisma.studentAchievement.create({
      data: { userId, badgeName, description },
    });
  }
}
