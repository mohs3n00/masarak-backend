import {
  IsString,
  IsOptional,
  IsBoolean,
  IsArray,
  IsInt,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  bio?: string;
}

export class UpdateStudentProfileDto {

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  academicYear?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  learningPreferences?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  countryId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  cityId?: string;
}

export class UpdateTeacherProfileDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  qualifications?: string;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subjectIds?: string[];

  @ApiPropertyOptional()
  @IsInt()
  @IsOptional()
  experience?: number;

  @ApiPropertyOptional()
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  levelIds?: string[];

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  socialLinks?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  countryId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  cityId?: string;
}

export class UpdateSettingsDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  accessibilityMode?: boolean;
}

export class UpdateNotificationSettingsDto {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  emailAlerts?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  smsAlerts?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  pushAlerts?: boolean;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  marketingAlerts?: boolean;
}

export class UpdatePrivacySettingsDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  profileVisibility?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  showActivity?: boolean;
}

export class UpdatePreferencesDto {
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  languageId?: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  themeId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  timezone?: string;
}
