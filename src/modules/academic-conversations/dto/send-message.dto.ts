import { IsString, IsOptional, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MessageAttachmentDto {
  @IsString() type: string;
  @IsString() url: string;
  @IsOptional() @IsString() name?: string;
  @IsOptional() @IsString() mimeType?: string;
  @IsOptional() sizeBytes?: number;
}

export class SendMessageDto {
  @IsString() content: string;
  @IsOptional() @IsString() replyToMessageId?: string;
  @IsOptional() metadata?: any;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageAttachmentDto)
  attachments?: MessageAttachmentDto[];
}
