import { IsString, IsOptional, IsEnum, IsInt, IsArray } from 'class-validator';

export enum ContextType {
  VIDEO = 'VIDEO',
  PDF = 'PDF',
  LESSON = 'LESSON',
  QUIZ = 'QUIZ',
  ASSIGNMENT = 'ASSIGNMENT',
  GENERAL = 'GENERAL',
}

export class CreateConversationDto {
  @IsString() courseId: string;
  @IsOptional() @IsString() lessonId?: string;
  @IsOptional() @IsString() videoId?: string;
  @IsString() teacherId: string;

  @IsEnum(ContextType) contextType: ContextType;
  @IsOptional() @IsInt() videoTimestamp?: number;
  @IsOptional() @IsInt() pdfPage?: number;
  @IsOptional() @IsString() highlightedText?: string;

  @IsOptional() @IsString() courseSnapshot?: string;
  @IsOptional() @IsString() lessonSnapshot?: string;
  @IsOptional() @IsString() videoSnapshot?: string;

  @IsString() initialMessage: string;

  @IsOptional() @IsArray() attachments?: {
    url: string;
    type: string;
    name?: string;
    mimeType?: string;
    sizeBytes?: number;
  }[];
}
