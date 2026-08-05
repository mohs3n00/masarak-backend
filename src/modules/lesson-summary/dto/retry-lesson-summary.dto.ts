import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

const STAGES = ['analysis', 'formatting', 'validation', 'layout', 'rendering', 'pdf', 'upload'] as const;

export class RetryLessonSummaryDto {
  @IsOptional()
  @IsString()
  @IsIn(STAGES)
  stage?: (typeof STAGES)[number];

  @IsOptional()
  @IsBoolean()
  forceFullPipeline?: boolean;
}
