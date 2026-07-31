import { Test, TestingModule } from '@nestjs/testing';
import { AcademicConversationsService } from './academic-conversations.service';

describe('AcademicConversationsService', () => {
  let service: AcademicConversationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AcademicConversationsService],
    }).compile();

    service = module.get<AcademicConversationsService>(
      AcademicConversationsService,
    );
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
