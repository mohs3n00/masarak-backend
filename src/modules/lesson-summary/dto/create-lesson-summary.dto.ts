import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateLessonSummaryDto {
  @IsString()
  @IsUrl({ require_tld: false })
  @MaxLength(1500)
  videoUrl!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  lessonId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  designVersion?: string;
}
