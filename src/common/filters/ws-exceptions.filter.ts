import { Catch, ArgumentsHost, Logger } from '@nestjs/common';
import { BaseWsExceptionFilter, WsException } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch()
export class WsExceptionsFilter extends BaseWsExceptionFilter {
  private readonly logger = new Logger(WsExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const client = host.switchToWs().getClient<Socket>();
    const data = host.switchToWs().getData();

    const timestamp = new Date().toISOString();
    const userId = client?.data?.user?.sub || 'anonymous';

    const errorMessage =
      exception instanceof WsException
        ? exception.getError()
        : exception instanceof Error
        ? exception.message
        : 'Unexpected WebSocket error';

    const stack = exception instanceof Error ? exception.stack : undefined;

    this.logger.error(
      `[WebSocket Error] User: ${userId} | SocketId: ${client?.id} | Error: ${JSON.stringify(
        errorMessage,
      )}`,
      {
        timestamp,
        userId,
        socketId: client?.id,
        payload: data,
        stack,
      },
    );

    client.emit('exception', {
      status: 'error',
      message:
        process.env.NODE_ENV === 'production' && !(exception instanceof WsException)
          ? 'Internal WebSocket server error'
          : errorMessage,
      timestamp,
    });
  }
}
