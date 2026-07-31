import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { UseFilters, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma/prisma.service';
import { WsExceptionsFilter } from '../../common/filters/ws-exceptions.filter';

@UseFilters(WsExceptionsFilter)
@WebSocketGateway({ cors: { origin: '*' }, namespace: '/academic-chat' })
export class AcademicConversationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(AcademicConversationsGateway.name);

  @WebSocketServer()
  server: Server;

  // Mapping userId to socketId(s)
  private userSockets = new Map<string, Set<string>>();

  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token =
        client.handshake.auth.token?.split(' ')[1] ||
        client.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        this.logger.warn(`[Socket Connect] Disconnected client ${client.id}: Missing token`);
        return client.disconnect();
      }

      const payload = this.jwtService.verify(token);

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        throw new Error('User deleted or inactive');
      }

      client.data.user = payload;
      const sockets = this.userSockets.get(payload.sub) || new Set();
      sockets.add(client.id);
      this.userSockets.set(payload.sub, sockets);

      this.logger.log(`[Socket Connected] User: ${payload.sub} | SocketId: ${client.id}`);
    } catch (e) {
      this.logger.error(`[Socket Auth Error] Client ${client.id}: ${e.message}`, e.stack);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data?.user) {
      const userId = client.data.user.sub;
      const sockets = this.userSockets.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(userId);
        }
      }
      this.logger.log(`[Socket Disconnected] User: ${userId} | SocketId: ${client.id}`);
    } else {
      this.logger.log(`[Socket Disconnected] Anonymous Client | SocketId: ${client.id}`);
    }
  }

  @OnEvent('academic.message.sent')
  handleMessageSentEvent(payload: { message: any; receiverId: string }) {
    try {
      const { receiverId, message } = payload;
      const sockets = this.userSockets.get(receiverId);
      if (sockets && sockets.size > 0) {
        sockets.forEach((socketId) => {
          this.server.to(socketId).emit('newMessage', message);
        });
      }
    } catch (e) {
      this.logger.error(`[MessageSentEvent Error]: ${e.message}`, e.stack);
    }
  }

  @SubscribeMessage('markAsSeen')
  async handleMarkAsSeen(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; conversationId: string },
  ) {
    if (!data?.messageId) return;

    try {
      await this.prisma.academicMessage.update({
        where: { id: data.messageId },
        data: { seenAt: new Date() },
      });
    } catch (e) {
      this.logger.error(`[markAsSeen Error] MessageId: ${data.messageId} - ${e.message}`, e.stack);
    }
  }

  @OnEvent('user.account.deleted')
  handleUserDeleted(event: { userId: string }) {
    const sockets = this.userSockets.get(event.userId);
    if (sockets) {
      sockets.forEach((socketId) => {
        const client = this.server.sockets.sockets.get(socketId);
        if (client) {
          client.disconnect(true);
        }
      });
      this.userSockets.delete(event.userId);
    }
  }
}
