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
import {
  COMMUNITY_DEFAULTS,
  COMMUNITY_TYPES,
  COMMUNITY_CATEGORIES,
  COMMUNITY_VISIBILITIES,
  COMMUNITY_STATUSES,
} from '../constants/community.constants';

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
  @IsString()
  postType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isQuestion?: boolean;

  @ApiPropertyOptional({ enum: ['published', 'draft'] })
  @IsOptional()
  @IsEnum(['published', 'draft'])
  status?: 'published' | 'draft';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorRole?: string;
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  authorRole?: string;
}

export class UpdateCommentDto {
  @ApiProperty()
  @IsString()
  @MaxLength(COMMUNITY_DEFAULTS.MAX_COMMENT_LENGTH)
  content: string;
}

export class ToggleReactionDto {
  @ApiProperty({ description: 'Reaction type or emoji (e.g., 👍, ❤️, 😂, 😮, 😢, 🙏)' })
  @IsString()
  type: string;
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
  @ApiProperty({ enum: COMMUNITY_TYPES })
  @IsEnum(COMMUNITY_TYPES)
  type: string;

  @ApiPropertyOptional({ enum: COMMUNITY_CATEGORIES })
  @IsOptional()
  @IsEnum(COMMUNITY_CATEGORIES)
  category?: string;

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  coverUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  rules?: string;

  @ApiPropertyOptional({ enum: COMMUNITY_VISIBILITIES })
  @IsOptional()
  @IsEnum(COMMUNITY_VISIBILITIES)
  visibility?: string;

  @ApiPropertyOptional()
  @IsOptional()
  gradeLevel?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subject?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  school?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  university?: string;
}

export class UpdateSpaceStatusDto {
  @ApiProperty({ enum: COMMUNITY_STATUSES })
  @IsString()
  status: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class SpaceQueryDto {
  @ApiPropertyOptional({ enum: COMMUNITY_TYPES })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ enum: COMMUNITY_CATEGORIES })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ enum: COMMUNITY_STATUSES })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cursor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
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
  limit?: string;
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
