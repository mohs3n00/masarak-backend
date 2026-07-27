import { Module } from '@nestjs/common';
import { AcademicRepository } from './academic.repository';
import { TaxonomyService } from './services/taxonomy.service';
import { StructureService } from './services/structure.service';
import { SubjectService } from './services/subject.service';
import { TimeService } from './services/time.service';
import { LearningPathService } from './services/learning-path.service';

import { TaxonomyController } from './controllers/taxonomy.controller';
import { StructureController } from './controllers/structure.controller';
import { SubjectController } from './controllers/subject.controller';
import { TimeController } from './controllers/time.controller';
import { LearningPathController } from './controllers/learning-path.controller';

@Module({
  controllers: [
    TaxonomyController,
    StructureController,
    SubjectController,
    TimeController,
    LearningPathController,
  ],
  providers: [
    AcademicRepository,
    TaxonomyService,
    StructureService,
    SubjectService,
    TimeService,
    LearningPathService,
  ],
  exports: [
    AcademicRepository,
    TaxonomyService,
    StructureService,
    SubjectService,
    TimeService,
    LearningPathService,
  ],
})
export class AcademicModule {}
