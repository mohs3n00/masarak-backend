import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../database/prisma/prisma.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { SendMessageDto } from './dto/send-message.dto';

@Injectable()
export class AcademicConversationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async createConversation(userId: string, dto: CreateConversationDto) {
    // Start transaction to create or update conversation and add initial message
    return this.prisma.$transaction(async (tx: any) => {
      let conv = await tx.academicConversation.findFirst({
        where: {
          studentId: userId,
          teacherId: dto.teacherId,
          courseId: dto.courseId,
        },
      });

      if (conv) {
        // Update the existing conversation with the new context and mark as unread
        conv = await tx.academicConversation.update({
          where: { id: conv.id },
          data: {
            lessonId: dto.lessonId || conv.lessonId,
            videoId: dto.videoId || conv.videoId,
            contextType: dto.contextType || conv.contextType,
            videoTimestamp: dto.videoTimestamp || conv.videoTimestamp,
            pdfPage: dto.pdfPage || conv.pdfPage,
            highlightedText: dto.highlightedText || conv.highlightedText,
            courseSnapshot: dto.courseSnapshot || conv.courseSnapshot,
            lessonSnapshot: dto.lessonSnapshot || conv.lessonSnapshot,
            videoSnapshot: dto.videoSnapshot || conv.videoSnapshot,
            unreadTeacherCount: { increment: 1 },
            status: 'WAITING_REPLY',
            lastMessageAt: new Date(),
          },
        });
      } else {
        // Create new conversation
        conv = await tx.academicConversation.create({
          data: {
            studentId: userId,
            teacherId: dto.teacherId,
            courseId: dto.courseId,
            lessonId: dto.lessonId,
            videoId: dto.videoId,
            contextType: dto.contextType,
            videoTimestamp: dto.videoTimestamp,
            pdfPage: dto.pdfPage,
            highlightedText: dto.highlightedText,
            courseSnapshot: dto.courseSnapshot,
            lessonSnapshot: dto.lessonSnapshot,
            videoSnapshot: dto.videoSnapshot,
            unreadTeacherCount: 1,
          },
        });
      }

      const msg = await tx.academicMessage.create({
        data: {
          conversationId: conv.id,
          senderId: userId,
          content: dto.initialMessage,
          metadata: dto.videoTimestamp !== undefined ? { videoTimestamp: dto.videoTimestamp } : undefined,
          ...(dto.attachments && dto.attachments.length > 0 && {
            attachments: {
              create: dto.attachments,
            },
          }),
        },
      });

      await tx.academicConversation.update({
        where: { id: conv.id },
        data: {
          lastMessageId: msg.id,
          lastMessageAt: msg.sentAt,
          lastSenderId: userId,
        },
      });

      return conv;
    });
  }

  async getConversations(userId: string, role: string, filters: any) {
    const where: any = {};
    if (role === 'STUDENT') where.studentId = userId;
    else if (role === 'TEACHER' || role === 'INSTRUCTOR')
      where.teacherId = userId;
    // Admin sees all, but we will add separate admin endpoints later

    if (filters.status) where.status = filters.status;
    if (filters.courseId) where.courseId = filters.courseId;
    if (filters.lessonId) where.lessonId = filters.lessonId;
    if (filters.videoId) where.videoId = filters.videoId;
    if (filters.contextType) where.contextType = filters.contextType;

    return this.prisma.academicConversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      include: {
        student: { select: { id: true, name: true, avatar: true } },
        teacher: { select: { id: true, name: true, avatar: true } },
        course: { select: { id: true, title: true } },
        lesson: { 
          select: {
            id: true,
            title: true,
            videos: { select: { id: true, videoUrl: true, provider: true } }
          }
        },
      },
      take: filters.limit ? parseInt(filters.limit) : 50,
      skip: filters.skip ? parseInt(filters.skip) : 0,
    });
  }

  async getConversation(id: string, userId: string, role: string) {
    const conv = await this.prisma.academicConversation.findUnique({
      where: { id },
      include: {
        messages: {
          orderBy: { sentAt: 'asc' },
          include: {
            attachments: true,
            sender: { select: { id: true, name: true, avatar: true } },
          },
        },
        student: { select: { id: true, name: true, avatar: true } },
        teacher: { select: { id: true, name: true, avatar: true } },
        lesson: { 
          select: {
            id: true,
            title: true,
            videos: { select: { id: true, videoUrl: true, provider: true } }
          }
        },
      },
    });
    if (!conv) throw new NotFoundException('Conversation not found');
    
    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    if (!isAdmin && conv.studentId !== userId && conv.teacherId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return conv;
  }

  async sendMessage(
    conversationId: string,
    senderId: string,
    dto: SendMessageDto,
  ) {
    const conv = await this.prisma.academicConversation.findUnique({
      where: { id: conversationId },
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    const isStudent = conv.studentId === senderId;

    return this.prisma.$transaction(async (tx: any) => {
      const msg = await tx.academicMessage.create({
        data: {
          conversationId,
          senderId,
          content: dto.content,
          replyToMessageId: dto.replyToMessageId,
          metadata: dto.metadata,
          attachments: dto.attachments
            ? {
                create: dto.attachments,
              }
            : undefined,
        },
        include: {
          attachments: true,
          sender: { select: { id: true, name: true, avatar: true } },
        },
      });

      await tx.academicConversation.update({
        where: { id: conversationId },
        data: {
          lastMessageId: msg.id,
          lastMessageAt: msg.sentAt,
          lastSenderId: senderId,
          unreadTeacherCount: isStudent ? { increment: 1 } : undefined,
          unreadStudentCount: !isStudent ? { increment: 1 } : undefined,
          status: isStudent ? 'WAITING_REPLY' : 'ANSWERED',
        },
      });

      this.eventEmitter.emit('academic.message.sent', {
        message: msg,
        receiverId: isStudent ? conv.teacherId : conv.studentId,
      });
      return msg;
    });
  }

  async deleteConversation(id: string, userId: string, role: string) {
    const conv = await this.prisma.academicConversation.findUnique({
      where: { id },
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    const isAdmin = role === 'ADMIN' || role === 'SUPER_ADMIN';
    if (!isAdmin && conv.teacherId !== userId) {
      throw new ForbiddenException('Only teachers or admins can delete conversations');
    }

    await this.prisma.academicConversation.delete({
      where: { id },
    });
    return { success: true };
  }
}
