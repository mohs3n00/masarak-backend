import { Test, TestingModule } from '@nestjs/testing';
import { AcademicConversationsController } from './academic-conversations.controller';

describe('AcademicConversationsController', () => {
  let controller: AcademicConversationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AcademicConversationsController],
    }).compile();

    controller = module.get<AcademicConversationsController>(
      AcademicConversationsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
