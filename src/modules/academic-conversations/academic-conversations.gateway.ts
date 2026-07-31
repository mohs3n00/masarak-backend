import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { OnEvent } from '@nestjs/event-emitter';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../database/prisma/prisma.service';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/academic-chat' })
export class AcademicConversationsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
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
      if (!token) return client.disconnect();

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

    } catch (e) {
      console.error('WebSocket Auth Error: Invalid token or user deleted', e.message);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    if (client.data.user) {
      const sockets = this.userSockets.get(client.data.user.sub);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.userSockets.delete(client.data.user.sub);
        }
      }
    }
  }

  @OnEvent('academic.message.sent')
  handleMessageSentEvent(payload: { message: any; receiverId: string }) {
    const { receiverId, message } = payload;
    const sockets = this.userSockets.get(receiverId);
    if (sockets && sockets.size > 0) {
      sockets.forEach(socketId => {
        this.server.to(socketId).emit('newMessage', message);
      });
    } else {
      // Send Push Notification since they are offline
    }
  }

  @SubscribeMessage('markAsSeen')
  async handleMarkAsSeen(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { messageId: string; conversationId: string },
  ) {
    await this.prisma.academicMessage.update({
      where: { id: data.messageId },
      data: { seenAt: new Date() },
    });
  }

  @OnEvent('user.account.deleted')
  handleUserDeleted(event: { userId: string }) {
    const sockets = this.userSockets.get(event.userId);
    if (sockets) {
      sockets.forEach(socketId => {
        const client = this.server.sockets.sockets.get(socketId);
        if (client) {
          client.disconnect(true);
        }
      });
      this.userSockets.delete(event.userId);
    }
  }
}
