import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { StartExamSessionDto, AutoSaveSessionDto, SubmitExamSessionDto } from '../dto/exam.dto';
import { LearningEngineService } from '../../course/services/learning-engine.service';

@Injectable()
export class ExamService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly learningEngineService: LearningEngineService,
  ) {}

  async getExamDetailsByLesson(userId: string, lessonId: string) {
    const template = await this.prisma.examTemplate.findUnique({
      where: { lessonId },
    });

    if (!template) {
      throw new NotFoundException('Exam not found for this lesson');
    }

    const existingSession = await this.prisma.examSession.findFirst({
      where: { examId: template.id, studentId: userId },
      orderBy: { startTime: 'desc' },
    });

    const rules = template.rules as any;
    const totalQuestions = rules?.limit || 0;

    const retakePermission = await this.prisma.examRetakePermission.findFirst({
      where: {
        examId: template.id,
        studentId: userId,
        isUsed: false,
      },
    });

    return {
      template,
      existingSession,
      totalQuestions,
      hasRetakePermission: !!retakePermission,
    };
  }

  async startSession(userId: string, dto: StartExamSessionDto) {
    const template = await this.prisma.examTemplate.findUnique({
      where: { id: dto.examTemplateId },
      include: {
        lesson: {
          include: {
            section: {
              include: {
                course: {
                  include: {
                    instructors: {
                      include: {
                        teacher: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!template) {
      throw new NotFoundException('Exam template not found');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { role: true }
    });
    
    const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN';
    const isTeacherOfCourse = template.lesson?.section?.course?.instructors.some(
      (inst) => inst.teacher?.userId === userId
    );
    const hasPrivilege = isAdmin || isTeacherOfCourse;

    // 1. Check Visibility
    if (!hasPrivilege && template.status !== 'PUBLISHED') {
      throw new ForbiddenException('هذا الاختبار غير متاح حالياً للطلاب');
    }

    // 2. Check Availability Dates
    const now = new Date();
    if (!hasPrivilege && template.availableFrom && now < template.availableFrom) {
      throw new ForbiddenException(`يبدأ الاختبار في: ${template.availableFrom.toLocaleString('ar-EG')}`);
    }
    if (!hasPrivilege && template.availableUntil && now > template.availableUntil) {
      throw new ForbiddenException(`انتهى وقت إتاحة الاختبار في: ${template.availableUntil.toLocaleString('ar-EG')}`);
    }

    const existingSession = await this.prisma.examSession.findFirst({
      where: {
        examId: template.id,
        studentId: userId,
      },
      orderBy: { startTime: 'desc' },
    });

    if (existingSession && existingSession.status === 'IN_PROGRESS') {
      return this.getSessionDetails(existingSession.id);
    }

    if (existingSession && existingSession.status === 'COMPLETED') {
      const retakePermission = await this.prisma.examRetakePermission.findFirst({
        where: {
          examId: template.id,
          studentId: userId,
          isUsed: false,
        },
      });

      if (retakePermission) {
        await this.prisma.examRetakePermission.update({
          where: { id: retakePermission.id },
          data: { isUsed: true },
        });
      } else {
        // 3. Check Attempts Limit
        if (!hasPrivilege && template.attemptsLimit > 0) {
          const completedAttemptsCount = await this.prisma.examSession.count({
            where: {
              examId: template.id,
              studentId: userId,
              status: 'COMPLETED',
            }
          });

          if (completedAttemptsCount >= template.attemptsLimit) {
            throw new BadRequestException(`لقد استنفذت عدد المحاولات المسموحة (${template.attemptsLimit}).`);
          }
        }
      }
    }

    const rules = template.rules as any;
    let questionsIds: string[] = [];

    if (rules && rules.categoryId) {
      const allQuestions = await this.prisma.questionBankItem.findMany({
        where: { categoryId: rules.categoryId, isArchived: false },
        select: { id: true },
      });

      const limit = rules.limit || 20;
      const shuffled = allQuestions.sort(() => 0.5 - Math.random());
      questionsIds = shuffled.slice(0, limit).map((question: any) => question.id);
    } else {
      const randomQuestions = await this.prisma.questionBankItem.findMany({
        where: { isArchived: false },
        take: 10,
        select: { id: true },
      });
      questionsIds = randomQuestions.map((question: any) => question.id);
    }

    if (questionsIds.length === 0) {
      throw new BadRequestException('لا يوجد أسئلة كافية في بنك الأسئلة لهذا الامتحان');
    }

    const newSession = await this.prisma.examSession.create({
      data: {
        examId: template.id,
        studentId: userId,
        questionsIds,
        status: 'IN_PROGRESS',
        passingScore: template.passingScore,
      },
    });

    return this.getSessionDetails(newSession.id);
  }

  async getSessionDetails(sessionId: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: true,
        answers: true,
      },
    });

    if (!session) throw new NotFoundException('Session not found');

    const qIds = session.questionsIds as string[];

    const questions = await this.prisma.questionBankItem.findMany({
      where: { id: { in: qIds } },
      include: {
        choices: {
          where: { isArchived: false },
          orderBy: { order: 'asc' },
          select: {
            id: true,
            text: true,
            questionId: true,
            imageUrl: true,
          },
        },
      },
    });

    const questionsById = new Map(questions.map((question: any) => [question.id, question]));
    const orderedQuestions = qIds.map((questionId) => questionsById.get(questionId)).filter(Boolean);

    const shuffledQuestions = orderedQuestions.map((question: any) => ({
      ...question,
      choices: question.choices.sort(() => 0.5 - Math.random()),
    }));

    return {
      session,
      questions: shuffledQuestions,
    };
  }

  async autoSave(userId: string, dto: AutoSaveSessionDto) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: dto.sessionId },
    });

    if (!session || session.studentId !== userId) {
      throw new ForbiddenException('Invalid session');
    }

    if (session.status === 'COMPLETED') {
      throw new BadRequestException('Session is already completed');
    }

    const exam = await this.prisma.examTemplate.findUnique({ where: { id: session.examId } });
    const now = new Date();
    const diffMins = (now.getTime() - session.startTime.getTime()) / 60000;

    if (exam && diffMins > exam.durationMin + 2) {
      await this.submitSession(userId, { sessionId: session.id });
      throw new BadRequestException('وقت الامتحان انتهى وتم التسليم التلقائي');
    }

    for (const answer of dto.answers) {
      await this.prisma.examAnswer.upsert({
        where: {
          sessionId_questionId: {
            sessionId: session.id,
            questionId: answer.questionId,
          },
        },
        create: {
          sessionId: session.id,
          questionId: answer.questionId,
          choiceId: answer.choiceId,
          selectedChoiceIds: answer.selectedChoiceIds,
          textAnswer: answer.textAnswer,
        },
        update: {
          choiceId: answer.choiceId,
          selectedChoiceIds: answer.selectedChoiceIds,
          textAnswer: answer.textAnswer,
        },
      });
    }

    return { success: true, message: 'Saved successfully' };
  }

  async submitSession(userId: string, dto: SubmitExamSessionDto) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: dto.sessionId },
      include: {
        answers: true,
        exam: { include: { lesson: { include: { section: true } } } },
      },
    });

    if (!session || session.studentId !== userId) {
      throw new ForbiddenException('Invalid session');
    }

    if (session.status === 'COMPLETED') {
      return { success: true, score: session.score };
    }

    let score = 0;
    const qIds = session.questionsIds as string[];

    const questions = await this.prisma.questionBankItem.findMany({
      where: { id: { in: qIds } },
      include: {
        choices: {
          orderBy: { order: 'asc' },
        },
      },
    });

    const questionsById = new Map(questions.map((question: any) => [question.id, question]));
    const orderedQuestions = qIds.map((questionId) => questionsById.get(questionId)).filter(Boolean);

    for (const answer of session.answers) {
      const question = orderedQuestions.find((item: any) => item.id === answer.questionId);
      if (!question) continue;

      const selectedChoiceIds = Array.isArray(answer.selectedChoiceIds)
        ? answer.selectedChoiceIds
        : answer.choiceId
          ? [answer.choiceId]
          : [];

      if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
        const selectedChoice = question.choices.find((choice: any) => choice.id === answer.choiceId);
        if (selectedChoice && selectedChoice.isCorrect) {
          score += question.points;
        }
      } else if (question.type === 'MULTIPLE_RESPONSE') {
        const correctChoiceIds = question.choices
          .filter((choice: any) => choice.isCorrect)
          .map((choice: any) => choice.id)
          .sort();
        const selectedSorted = [...selectedChoiceIds].sort();
        const matches =
          correctChoiceIds.length === selectedSorted.length &&
          correctChoiceIds.every((id: string, index: number) => id === selectedSorted[index]);
        if (matches) {
          score += question.points;
        }
      }
    }

    let totalPoints = 0;
    for (const question of orderedQuestions) {
      totalPoints += question.points || 1;
    }

    const percentageScore = totalPoints > 0 ? Math.round((score / totalPoints) * 100) : 0;
    const finalScore = session.exam?.passingScoreType === 'MARKS' ? score : percentageScore;

    await this.prisma.examSession.update({
      where: { id: session.id },
      data: {
        status: 'COMPLETED',
        endTime: new Date(),
        score: finalScore,
      },
    });

    if (session.exam?.lessonId && session.exam.lesson?.section?.courseId) {
      await this.learningEngineService.completeLesson(
        userId,
        session.exam.lessonId,
        session.exam.lesson.section.courseId,
      );
    }

    return { success: true, score: finalScore };
  }

  async getReviewDetails(userId: string, sessionId: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: {
          include: { lesson: { include: { section: { include: { course: { include: { instructors: true } } } } } } },
        },
        answers: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const isStudent = session.studentId === userId;
    let isTeacherOrAdmin = false;

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user && (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN')) {
      isTeacherOrAdmin = true;
    } else {
      const courseId = session.exam?.lesson?.section?.course?.id;
      if (courseId) {
        const ownership = await this.prisma.courseInstructor.findFirst({
          where: { courseId, teacher: { userId } },
        });
        if (ownership) isTeacherOrAdmin = true;
      }
    }

    if (!isStudent && !isTeacherOrAdmin) {
      throw new ForbiddenException('You do not have permission to review this session');
    }

    const qIds = session.questionsIds as string[];

    const questions = await this.prisma.questionBankItem.findMany({
      where: { id: { in: qIds } },
      include: {
        choices: {
          orderBy: { order: 'asc' },
        },
      },
    });

    const questionsById = new Map(questions.map((question: any) => [question.id, question]));
    const orderedQuestions = qIds.map((questionId) => questionsById.get(questionId)).filter(Boolean);

    return {
      session,
      questions: orderedQuestions,
    };
  }
}