import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  IsOptional,
  IsPhoneNumber,
  IsArray,
  IsInt,
  IsBoolean,
  Min,
  Matches,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { IsEgyptianNationalId } from '../../../common/validators/egyptian-national-id.validator';
export class RegisterTeacherDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string;


  @IsNotEmpty()
  @IsPhoneNumber('EG')
  phone: string;

  @IsString()
  @MinLength(8)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/, {
    message: 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
  })
  password: string;

  @IsEgyptianNationalId({ message: 'الرقم القومي غير صالح' })
  nationalId: string;

  @IsOptional()
  @IsString()
  avatar?: string;

  @IsOptional()
  @IsString()
  biography?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  subjectIds?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  levelIds?: string[];

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  experience?: number;

  @IsBoolean()
  termsAccepted: boolean;
}
