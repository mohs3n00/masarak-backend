import { IsEnum, IsNotEmpty, IsString } from 'class-validator';
import { OtpType } from '@prisma/client';

export class VerifyOtpDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsNotEmpty()
  code: string;

  @IsEnum(OtpType)
  @IsNotEmpty()
  type: OtpType;
}

export class SendOtpDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsEnum(OtpType)
  @IsNotEmpty()
  type: OtpType;
}

export class VerifyFirebaseTokenDto {
  @IsString()
  @IsNotEmpty()
  idToken: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
