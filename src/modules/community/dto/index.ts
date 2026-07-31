import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  MaxLength,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { COMMUNITY_DEFAULTS } from '../constants/community.constants';

export class CreatePostDto {
  @ApiProperty()
  @IsString()
  spaceId: string;

  @ApiProperty()
  @IsString()
  @MaxLength(COMMUNITY_DEFAULTS.MAX_CONTENT_LENGTH)
  content: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(COMMUNITY_DEFAULTS.MAX_TAGS)
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isQuestion?: boolean;

  @ApiPropertyOptional({ enum: ['published', 'draft'] })
  @IsOptional()
  @IsEnum(['published', 'draft'])
  status?: 'published' | 'draft';
}

export class UpdatePostDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(COMMUNITY_DEFAULTS.MAX_CONTENT_LENGTH)
  content?: string;

  @ApiPropertyOptional({ enum: ['published', 'draft', 'archived'] })
  @IsOptional()
  @IsEnum(['published', 'draft', 'archived'])
  status?: 'published' | 'draft' | 'archived';

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ArrayMaxSize(COMMUNITY_DEFAULTS.MAX_TAGS)
  tags?: string[];
}

export class CreateCommentDto {
  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Parent comment ID for nested replies' })
  @IsOptional()
  @IsString()
  parentId?: string;
}

export class UpdateCommentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(COMMUNITY_DEFAULTS.MAX_COMMENT_LENGTH)
  content: string;
}

export class ToggleReactionDto {
  @ApiProperty({ enum: ['like', 'love', 'celebrate', 'insightful'] })
  @IsEnum(['like', 'love', 'celebrate', 'insightful'])
  type: 'like' | 'love' | 'celebrate' | 'insightful';
}

export class CreateReportDto {
  @ApiProperty({
    enum: ['spam', 'harassment', 'inappropriate', 'misinformation', 'other'],
  })
  @IsEnum(['spam', 'harassment', 'inappropriate', 'misinformation', 'other'])
  reason: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;
}

export class CreateSpaceDto {
  @ApiProperty({ enum: ['global', 'course', 'lesson', 'teacher'] })
  @IsEnum(['global', 'course', 'lesson', 'teacher'])
  type: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  referenceId?: string;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class FeedQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  spaceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string; // comes as query string
}

export class SearchQueryDto {
  @ApiProperty()
  @IsString()
  q: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  spaceId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}
