import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  // Override handleRequest to not throw errors if user is not found
  handleRequest<TUser = any>(err: unknown, user: any): TUser {
    return user;
  }
}
