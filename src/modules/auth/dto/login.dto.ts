import {
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
} from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  identifier: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsOptional()
  @IsString()
  fcmToken?: string;

  // Optional for backward compatibility with older frontend clients
  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  rememberMe?: boolean;
}
