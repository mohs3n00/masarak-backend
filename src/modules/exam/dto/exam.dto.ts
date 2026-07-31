import {
  IsString,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  IsNumber,
  IsOptional,
  IsArray,
  ValidateNested,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  IsBoolean,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StartExamSessionDto {
  @IsString()
  examTemplateId: string;
}

export class AutoSaveAnswerDto {
  @IsString()
  questionId: string;

  @IsOptional()
  @IsString()
  choiceId?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedChoiceIds?: string[];

  @IsOptional()
  @IsString()
  textAnswer?: string;
}

export class AutoSaveSessionDto {
  @IsString()
  sessionId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AutoSaveAnswerDto)
  answers: AutoSaveAnswerDto[];
}

export class SubmitExamSessionDto {
  @IsString()
  sessionId: string;
}
