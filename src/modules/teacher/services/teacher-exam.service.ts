import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { CreateOrUpdateExamDto } from '../dto/teacher-exam.dto';

@Injectable()
export class TeacherExamService {
  constructor(private readonly prisma: PrismaService) {}

  async createOrUpdateExam(
    userId: string,
    courseId: string,
    lessonId: string,
    dto: CreateOrUpdateExamDto
  ) {
    return this.prisma.$transaction(async (prisma) => {
      // 1. Verify ownership
      const ownership = await prisma.courseInstructor.findFirst({
        where: { courseId, teacher: { userId } },
      });
      if (!ownership) throw new ForbiddenException('You do not own this course');

      const lesson = await prisma.lesson.findFirst({
        where: { id: lessonId, section: { courseId } },
      });
      if (!lesson || lesson.type !== 'EXAM') {
        throw new BadRequestException('Lesson not found or not an EXAM type');
      }

      // 2. Find or create a QuestionBankCategory for this lesson
      let category = await prisma.questionBankCategory.findFirst({
        where: { name: `lesson_${lessonId}` },
      });

      if (!category) {
        category = await prisma.questionBankCategory.create({
          data: { name: `lesson_${lessonId}` },
        });
      }

      // 3. Sync questions without deleting historical records
      const incomingQuestionIds = dto.questions.map((q) => q.id).filter(Boolean) as string[];
      const removedQuestions = await prisma.questionBankItem.findMany({
        where: {
          categoryId: category.id,
          ...(incomingQuestionIds.length > 0 ? { id: { notIn: incomingQuestionIds } } : {}),
          isArchived: false,
        },
        select: { id: true },
      });

      if (removedQuestions.length > 0) {
        await prisma.questionBankItem.updateMany({
          where: { id: { in: removedQuestions.map((q) => q.id) } },
          data: { isArchived: true },
        });
        await prisma.questionChoice.updateMany({
          where: { questionId: { in: removedQuestions.map((q) => q.id) } },
          data: { isArchived: true },
        });
      }

      for (const [index, q] of dto.questions.entries()) {
        const correctChoiceCount = q.choices.filter((c) => c.isCorrect).length;
        if (q.type === 'SHORT_TEXT') {
          if (q.choices.length > 0) {
            throw new BadRequestException(`Question "${q.text}" must not define choices for short-text answers.`);
          }
        } else if (correctChoiceCount === 0) {
          throw new BadRequestException(`Question "${q.text}" must have at least one correct choice.`);
        }

        if (q.id) {
          await prisma.questionBankItem.update({
            where: { id: q.id },
            data: {
              text: q.text,
              type: q.type,
              points: q.points || 1,
              order: q.order ?? index,
              imageUrl: q.imageUrl,
              explanation: q.explanation,
              isArchived: false,
            },
          });

          const incomingChoiceIds = q.choices.map((c) => c.id).filter(Boolean) as string[];
          await prisma.questionChoice.updateMany({
            where: {
              questionId: q.id,
              ...(incomingChoiceIds.length > 0 ? { id: { notIn: incomingChoiceIds } } : {}),
              isArchived: false,
            },
            data: { isArchived: true },
          });

          for (const [cIndex, c] of q.choices.entries()) {
            if (c.id) {
              await prisma.questionChoice.update({
                where: { id: c.id },
                data: {
                  text: c.text,
                  isCorrect: c.isCorrect,
                  order: c.order ?? cIndex,
                  imageUrl: c.imageUrl,
                  isArchived: false,
                },
              });
            } else {
              await prisma.questionChoice.create({
                data: {
                  questionId: q.id,
                  text: c.text,
                  isCorrect: c.isCorrect,
                  order: c.order ?? cIndex,
                  imageUrl: c.imageUrl,
                },
              });
            }
          }
        } else {
          await prisma.questionBankItem.create({
            data: {
              categoryId: category.id,
              text: q.text,
              points: q.points || 1,
              type: q.type,
              order: q.order ?? index,
              imageUrl: q.imageUrl,
              explanation: q.explanation,
              choices: {
                create: q.choices.map((c, cIndex) => ({
                  text: c.text,
                  isCorrect: c.isCorrect,
                  order: c.order ?? cIndex,
                  imageUrl: c.imageUrl,
                })),
              },
            },
          });
        }
      }

      // 4. Create or update ExamTemplate
      const rules = { categoryId: category.id, limit: dto.questions.length, ...dto.rules };

      const parseDate = (d?: string | null) => {
        if (!d || d.trim() === '') return null;
        const parsed = new Date(d);
        return isNaN(parsed.getTime()) ? null : parsed;
      };

      const template = await prisma.examTemplate.upsert({
        where: { lessonId: lesson.id },
        create: {
          lessonId: lesson.id,
          title: dto.title || lesson.title,
          description: dto.description,
          instructions: dto.instructions,
          durationMin: dto.durationMin || 30,
          passingScore: dto.passingScore || 50,
          passingScoreType: dto.passingScoreType || 'PERCENTAGE',
          attemptsLimit: dto.attemptsLimit ?? 1,
          availableFrom: parseDate(dto.availableFrom),
          availableUntil: parseDate(dto.availableUntil),
          status: dto.status || 'PUBLISHED',
          rules,
        },
        update: {
          title: dto.title || lesson.title,
          description: dto.description,
          instructions: dto.instructions,
          durationMin: dto.durationMin || 30,
          passingScore: dto.passingScore || 50,
          passingScoreType: dto.passingScoreType || 'PERCENTAGE',
          attemptsLimit: dto.attemptsLimit ?? 1,
          availableFrom: parseDate(dto.availableFrom),
          availableUntil: parseDate(dto.availableUntil),
          status: dto.status || 'PUBLISHED',
          rules,
        },
      });

      return { success: true, template };
    });
  }

  async getExamForLesson(userId: string, courseId: string, lessonId: string) {
    const ownership = await this.prisma.courseInstructor.findFirst({
      where: { courseId, teacher: { userId } },
    });
    if (!ownership) throw new ForbiddenException('You do not own this course');

    const template = await this.prisma.examTemplate.findUnique({
      where: { lessonId },
      include: { lesson: true }
    });

    if (!template) {
      return null;
    }

    const rules = template.rules as any;
    if (!rules || !rules.categoryId) return template;

    const questions = await this.prisma.questionBankItem.findMany({
      where: { categoryId: rules.categoryId, isArchived: false },
      orderBy: { order: 'asc' },
      include: {
        choices: {
          where: { isArchived: false },
          orderBy: { order: 'asc' },
        },
      },
    });

    return {
      ...template,
      questions
    };
  }

  async grantRetakePermission(userId: string, courseId: string, lessonId: string, studentId: string) {
    const ownership = await this.prisma.courseInstructor.findFirst({
      where: { courseId, teacher: { userId } },
      include: { course: true }
    });
    if (!ownership) throw new ForbiddenException('You do not own this course');

    const template = await this.prisma.examTemplate.findUnique({
      where: { lessonId },
      include: { lesson: true }
    });
    if (!template) throw new NotFoundException('Exam not found');

    const [retake] = await this.prisma.$transaction([
      this.prisma.examRetakePermission.create({
        data: {
          examId: template.id,
          studentId,
          grantedBy: userId,
          isUsed: false
        }
      }),
      this.prisma.notification.create({
        data: {
          userId: studentId,
          type: 'SYSTEM',
          title: 'صلاحية إعادة اختبار',
          message: `تم منحك صلاحية إعادة الاختبار الخاص بالدرس: ${template.lesson.title}`,
          actionUrl: `/dashboard/student/course/${courseId}`
        }
      })
    ]);

    return retake;
  }
}
