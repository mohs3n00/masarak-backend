import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class AskLessonDto {
  @IsString()
  @MaxLength(1000)
  question: string;
}

export class CreateNoteDto {
  @IsString()
  @MaxLength(5000)
  content: string;

  @IsOptional()
  @IsString()
  blockId?: string;
}

export class CreateBookmarkDto {
  @IsOptional()
  @IsString()
  blockId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;
}

export class UpdateProgressDto {
  @IsInt()
  @Min(0)
  @Max(100)
  percent: number;

  @IsBoolean()
  completed: boolean;
}
