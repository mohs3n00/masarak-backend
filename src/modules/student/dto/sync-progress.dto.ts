import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class SyncVideoProgressDto {
  @ApiProperty({ description: 'ID of the lesson video' })
  @IsString()
  @IsNotEmpty()
  videoId: string;

  @ApiProperty({ description: 'Seconds watched in this specific session' })
  @IsNumber()
  @Min(0)
  deltaSeconds: number;

  @ApiProperty({ description: 'Current playback position for resuming later (optional)' })
  @IsNumber()
  @IsOptional()
  currentPosition?: number;

  @ApiProperty({ description: 'Whether the video is considered completed' })
  @IsBoolean()
  @IsOptional()
  isCompleted?: boolean;
}

export class SyncProgressBatchDto {
  @ApiProperty({ type: [SyncVideoProgressDto] })
  @IsNotEmpty()
  progress: SyncVideoProgressDto[];
}
