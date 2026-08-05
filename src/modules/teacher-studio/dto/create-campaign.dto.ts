import { IsArray, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateCampaignDto {
  @IsString() @MaxLength(200)
  topic: string;

  @IsOptional() @IsString() @MaxLength(1000)
  context?: string;

  @IsIn(['instagram_post', 'story', 'youtube', 'whatsapp', 'announcement'])
  format: 'instagram_post' | 'story' | 'youtube' | 'whatsapp' | 'announcement';

  @IsOptional() @IsArray() @IsString({ each: true })
  audience?: string[];
}
