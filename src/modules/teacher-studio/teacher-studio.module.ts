import { Module } from '@nestjs/common';
import { TeacherStudioController } from './teacher-studio.controller';
import { TeacherStudioService } from './teacher-studio.service';

@Module({ controllers: [TeacherStudioController], providers: [TeacherStudioService] })
export class TeacherStudioModule {}
