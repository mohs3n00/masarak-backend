import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../database/prisma/prisma.service';
import { TokenService } from './token.service';
import { SessionService } from './session.service';
import { OtpService } from './otp.service';
import { AuditService } from './audit.service';
import { FirebaseService } from '../../firebase/firebase.service';
import { EmailService } from '../../email/email.service';
import { VerificationService } from '../../verification/verification.service';
import * as argon2 from 'argon2';
import { Role, AuditAction, OtpType } from '@prisma/client';
import { extractNationalIdInfo } from '../../../common/validators/egyptian-national-id.validator';
import { RegisterStudentDto } from '../dto/register-student.dto';
import { RegisterTeacherDto } from '../dto/register-teacher.dto';
import { LoginDto } from '../dto/login.dto';
import { ResetPasswordDto, ChangePasswordDto, ForceChangePasswordDto } from '../dto/password.dto';

// Balanced argon2 options: secure enough for production, manageable on low-resource servers
const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 32768, // 32 MB (reduced from default 65536 = 64 MB)
  timeCost: 2,       // 2 iterations (reduced from default 3)
  parallelism: 1,
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
    private readonly sessionService: SessionService,
    private readonly otpService: OtpService,
    private readonly auditService: AuditService,
    private readonly firebaseService: FirebaseService,
    private readonly emailService: EmailService,
    private readonly verificationService: VerificationService,
  ) {}

  async registerStudent(
    dto: RegisterStudentDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    if (dto.parentPhone && dto.phone === dto.parentPhone) {
      throw new BadRequestException('رقم الهاتف ورقم ولي الأمر لا يمكن أن يكونا متطابقين');
    }

    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: dto.phone },
          { email: { equals: dto.email, mode: 'insensitive' } },
        ]
      }
    });
    if (existing) {
      if (existing.phone === dto.phone) throw new ConflictException('رقم الهاتف مسجل بالفعل، يرجى تسجيل الدخول');
      if (existing.email === dto.email) throw new ConflictException('البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول');
    }

    const hashedPassword = await argon2.hash(dto.password, ARGON2_OPTIONS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        password: hashedPassword,
        firstName: dto.firstName,
        middleName: dto.middleName || '',
        lastName: dto.lastName || '',
        familyName: dto.familyName || '',
        name: [dto.firstName, dto.middleName, dto.lastName, dto.familyName].filter(Boolean).join(' '),
        role: Role.STUDENT,
        phoneVerified: true,
        avatar: dto.avatar,
        studentProfile: {
          create: {
            countryId: dto.country,
            governorate: dto.governorate || null,
            city: dto.city || null,
            grade: dto.grade,
            track: dto.track,
            parentPhone: dto.parentPhone,
            school: dto.school,
          },
        },
      },
    });

    await this.auditService.logAction(
      user.id,
      AuditAction.REGISTER,
      ipAddress,
      userAgent,
    );
    return {
      message: 'Registration successful',
      userId: user.id,
    };
  }

  async registerTeacher(
    dto: RegisterTeacherDto,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: dto.phone },
          { email: { equals: dto.email, mode: 'insensitive' } },
        ]
      }
    });
    if (existing) {
      if (existing.phone === dto.phone) throw new ConflictException('رقم الهاتف مسجل بالفعل، يرجى تسجيل الدخول');
      if (existing.email === dto.email) throw new ConflictException('البريد الإلكتروني مسجل بالفعل، يرجى تسجيل الدخول');
    }

    const existingNid = await this.prisma.teacherProfile.findUnique({
      where: { nationalId: dto.nationalId },
    });
    if (existingNid) {
      throw new ConflictException('الرقم القومي مسجل بالفعل');
    }

    let dateOfBirth: Date;
    let gender: 'MALE' | 'FEMALE';
    try {
      const info = extractNationalIdInfo(dto.nationalId);
      dateOfBirth = info.dateOfBirth;
      gender = info.gender as 'MALE' | 'FEMALE';
    } catch (e) {
      throw new BadRequestException('الرقم القومي غير صحيح');
    }

    const today = new Date();
    let age = today.getFullYear() - dateOfBirth.getFullYear();
    const m = today.getMonth() - dateOfBirth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dateOfBirth.getDate())) {
      age--;
    }

    if (age < 21) {
      throw new BadRequestException('يجب أن يكون عمر المعلم 21 عاماً على الأقل');
    }

    const hashedPassword = await argon2.hash(dto.password, ARGON2_OPTIONS);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        phone: dto.phone,
        password: hashedPassword,
        firstName: dto.name.split(' ')[0] || '',
        middleName: '',
        lastName: '',
        familyName: dto.name.split(' ').slice(1).join(' ') || '',
        name: dto.name,
        role: Role.TEACHER,
        phoneVerified: true,
        dateOfBirth,
        gender,
        avatar: dto.avatar,
        teacherProfile: {
          create: {
            nationalId: dto.nationalId,
            experience: dto.experience || 0,
            verificationStatus: 'PENDING',
            subjects: {
              connect: dto.subjectIds?.map(id => ({ id })) || []
            },
            levels: {
              connect: dto.levelIds?.map(id => ({ id })) || []
            }
          },
        },
      },
    });

    await this.auditService.logAction(
      user.id,
      AuditAction.REGISTER,
      ipAddress,
      userAgent,
    );

    return {
      message: 'Registration successful',
      userId: user.id,
    };
  }

  async login(dto: LoginDto, ipAddress?: string, userAgent?: string) {
    const identifier = dto.identifier || dto.phone;
    if (!identifier) throw new BadRequestException('رقم الهاتف مطلوب');

    const user = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: identifier },
          { email: { equals: identifier, mode: 'insensitive' } },
          { username: identifier },
        ],
      },
    });

    if (!user)
      throw new UnauthorizedException('بيانات الدخول غير صحيحة');

    if (!user.isActive)
      throw new UnauthorizedException('تم إيقاف هذا الحساب');

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const lockMinutes = Math.ceil((user.lockedUntil.getTime() - new Date().getTime()) / 60000);
      throw new UnauthorizedException(`الحساب مقفول مؤقتاً. يرجى المحاولة بعد ${lockMinutes} دقيقة.`);
    }

    const isMatch = await argon2.verify(user.password, dto.password);
    if (!isMatch) {
      const newAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData: any = { failedLoginAttempts: newAttempts };
      
      if (newAttempts >= 5) {
        updateData.lockedUntil = new Date(Date.now() + 15 * 60000); // Lock for 15 minutes
      }

      await this.prisma.user.update({
        where: { id: user.id },
        data: updateData,
      });

      throw new UnauthorizedException('بيانات الدخول غير صحيحة');
    }

    // Reset failed attempts
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    if (user.requiresPasswordChange) {
      // Throw special 403 error for frontend to handle force-change-password
      throw new ConflictException({
        errorCode: 'PASSWORD_CHANGE_REQUIRED',
        message: 'You must change your password on your first login.',
        userId: user.id, // Return userId to identify which user needs password change
      });
    }

    const tempRefreshToken = `temp_${Date.now()}`;
    const session = await this.sessionService.createSession(
      user.id,
      tempRefreshToken,
      ipAddress,
      userAgent,
      dto.fcmToken,
    );

    const tokens = await this.tokenService.generateTokens(user, session.id);

    const hashedRefresh = await argon2.hash(tokens.refreshToken, ARGON2_OPTIONS);
    await this.prisma.session.update({
      where: { id: session.id },
      data: { hashedRefreshToken: hashedRefresh },
    });

    await this.auditService.logAction(
      user.id,
      AuditAction.LOGIN,
      ipAddress,
      userAgent,
    );

    return { tokens, user };
  }

  async logout(
    sessionId: string,
    userId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    await this.sessionService.revokeSession(sessionId);
    await this.auditService.logAction(
      userId,
      AuditAction.LOGOUT,
      ipAddress,
      userAgent,
    );
  }

  async refreshToken(oldRefreshToken: string) {
    const decoded = await this.tokenService.verifyRefreshToken(oldRefreshToken);
    const user = await this.prisma.user.findUnique({
      where: { id: decoded.sub },
    });
    if (!user || !user.isActive)
      throw new UnauthorizedException('User not found or banned');

    const tokens = await this.tokenService.generateTokens(
      user,
      decoded.sessionId,
    );
    await this.sessionService.validateAndRotateSession(
      decoded.sessionId,
      oldRefreshToken,
      tokens.refreshToken,
    );
    return tokens;
  }

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (!user) {
      throw new BadRequestException('البريد الإلكتروني غير مسجل لدينا.');
    }

    const code = await this.verificationService.generateResetCode(user.id);
    await this.emailService.sendPasswordResetEmail(user.email, code);
  }

  async verifyResetCode(email: string, code: string) {
    const user = await this.prisma.user.findFirst({ where: { email: { equals: email, mode: 'insensitive' } } });
    if (!user) {
      // Throw generic error even if user not found, but we can't verify code without user.
      // We should use a generic message anyway.
      throw new BadRequestException('الرمز غير صالح أو منتهي الصلاحية.');
    }

    await this.verificationService.verifyResetCode(user.id, code);
    return { message: 'Code is valid' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({ where: { email: { equals: dto.email, mode: 'insensitive' } } });
    if (!user) {
      throw new BadRequestException('طلب غير صالح.');
    }

    // Verify code again to ensure it's still valid at the moment of password reset
    await this.verificationService.verifyResetCode(user.id, dto.code);

    const hashedPassword = await argon2.hash(dto.newPassword, ARGON2_OPTIONS);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    await this.verificationService.markAsUsed(user.id);
    await this.sessionService.revokeAllUserSessions(user.id);
    await this.auditService.logAction(user.id, AuditAction.PASSWORD_CHANGE);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();

    const isMatch = await argon2.verify(user.password, dto.oldPassword);
    if (!isMatch) throw new BadRequestException('Incorrect old password');

    const hashedPassword = await argon2.hash(dto.newPassword, ARGON2_OPTIONS);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    await this.auditService.logAction(userId, AuditAction.PASSWORD_CHANGE);
  }
  async forceChangePassword(dto: ForceChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('User not found');

    if (!user.requiresPasswordChange) {
      throw new BadRequestException('User does not require a password change');
    }

    const isMatch = await argon2.verify(user.password, dto.oldPassword);
    if (!isMatch) throw new BadRequestException('Incorrect old password');

    const hashedPassword = await argon2.hash(dto.newPassword, ARGON2_OPTIONS);
    await this.prisma.user.update({
      where: { id: dto.userId },
      data: { 
        password: hashedPassword,
        requiresPasswordChange: false,
      },
    });

    await this.auditService.logAction(dto.userId, AuditAction.PASSWORD_CHANGE);
  }
}
