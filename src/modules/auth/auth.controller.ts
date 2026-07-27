import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  Delete,
  Patch,
  UploadedFile,
  UseInterceptors,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { AuthService } from './services/auth.service';
import { RegisterStudentDto } from './dto/register-student.dto';
import { RegisterTeacherDto } from './dto/register-teacher.dto';
import { LoginDto } from './dto/login.dto';
import { VerifyOtpDto, SendOtpDto, VerifyFirebaseTokenDto } from './dto/otp.dto';
import {
  ResetPasswordDto,
  ForgotPasswordDto,
  ChangePasswordDto,
  ForceChangePasswordDto,
  VerifyResetCodeDto,
} from './dto/password.dto';
import { RefreshTokenDto } from './dto/refresh.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { StorageService } from '../../shared/storage/storage.service';
import { PrismaService } from '../../database/prisma/prisma.service';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Post('register/student')
  @Throttle({ default: { ttl: 60000, limit: 50 } })
  @ApiOperation({ summary: 'Register a new student account' })
  async registerStudent(@Body() dto: RegisterStudentDto, @Req() req: Request) {
    return this.authService.registerStudent(
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Public()
  @Post('register/teacher')
  @ApiOperation({ summary: 'Register a new teacher account' })
  async registerTeacher(@Body() dto: RegisterTeacherDto, @Req() req: Request) {
    return this.authService.registerTeacher(
      dto,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 50 } })
  @ApiOperation({ summary: 'Login and receive access and refresh tokens' })
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const { tokens, user } = await this.authService.login(
      dto,
      req.ip,
      req.headers['user-agent'],
    );

    const isProduction = process.env.NODE_ENV === 'production';
    
    // Default maxAge is 15 minutes for access token
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict',
      maxAge: 15 * 60 * 1000, 
    });

    // Refresh token lives for 30 days if rememberMe, else 1 day (or could be session-only)
    const refreshTokenMaxAge = dto.rememberMe 
      ? 30 * 24 * 60 * 60 * 1000 // 30 days
      : undefined; // undefined = Session cookie (expires on browser close)

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict',
      ...(refreshTokenMaxAge ? { maxAge: refreshTokenMaxAge } : {}),
    });

    return { 
      message: 'Logged in successfully',
      tokens,
      user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and revoke the current session' })
  async logout(
    @CurrentUser() user: any,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logout(
      user.sessionId,
      user.id,
      req.ip,
      req.headers['user-agent'],
    );
    const isProduction = process.env.NODE_ENV === 'production';
    const cookieOptions = {
      httpOnly: true,
      secure: isProduction,
      sameSite: (isProduction ? 'none' : 'lax') as any,
    };
    res.clearCookie('refreshToken', cookieOptions);
    res.clearCookie('accessToken', cookieOptions);
    return { message: 'Logged out successfully' };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate the refresh token and receive a new access token',
  })
  async refresh(
    @Req() req: Request,
    @Body() body: any,
    @Res({ passthrough: true }) res: Response,
  ) {
    console.log('[AuthController.refresh] Received entire Body payload:', body);
    const bodyRefreshToken = body?.refreshToken;
    const refreshToken = req.cookies?.refreshToken || bodyRefreshToken;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is missing');
    }
    const tokens = await this.authService.refreshToken(refreshToken);

    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('accessToken', tokens.accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    return {
      message: 'Tokens refreshed successfully',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }


  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 3 } }) // 3 requests per minute
  @ApiOperation({ summary: 'Request password reset via Email' })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    await this.authService.forgotPassword(dto.email);
    return { message: 'If user exists, a reset code was sent to the email.' };
  }

  @Public()
  @Post('verify-reset-code')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { ttl: 60000, limit: 5 } })
  @ApiOperation({ summary: 'Verify the reset code sent to email' })
  async verifyResetCode(@Body() dto: VerifyResetCodeDto) {
    await this.authService.verifyResetCode(dto.email, dto.code);
    return { message: 'Code is valid' };
  }

  @Public()
  @Post('password/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset the password using OTP' })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);
    return { message: 'Password reset successfully' };
  }

  @Post('password/change')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the password (requires current password)' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() dto: ChangePasswordDto,
  ) {
    await this.authService.changePassword(userId, dto);
    return { message: 'Password changed successfully' };
  }

  @Public()
  @Post('force-change-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Force password change for accounts requiring it (like first-login Super Admin)' })
  async forceChangePassword(@Body() dto: ForceChangePasswordDto) {
    await this.authService.forceChangePassword(dto);
    return { message: 'Password updated successfully. You can now login with your new password.' };
  }

  @Patch('avatar')
  @ApiBearerAuth()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'Upload a new avatar' })
  async uploadAvatar(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const result = await this.storageService.uploadFile(file, {
      folder: 'avatars',
      publicId: userId,
    });
    await this.prisma.user.update({
      where: { id: userId },
      data: { avatar: result.url },
    });
    return { message: 'Avatar updated', url: result.url };
  }

  @Delete('avatar')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove the avatar' })
  async deleteAvatar(@CurrentUser('id') userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.avatar) {
      await this.storageService.deleteFile(user.avatar);
      await this.prisma.user.update({
        where: { id: userId },
        data: { avatar: null },
      });
    }
    return { message: 'Avatar deleted' };
  }
}
