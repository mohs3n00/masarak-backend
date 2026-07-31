import { Test, TestingModule } from '@nestjs/testing';
import { AcademicConversationsGateway } from './academic-conversations.gateway';

describe('AcademicConversationsGateway', () => {
  let gateway: AcademicConversationsGateway;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AcademicConversationsGateway],
    }).compile();

    gateway = module.get<AcademicConversationsGateway>(
      AcademicConversationsGateway,
    );
  });

  it('should be defined', () => {
    expect(gateway).toBeDefined();
  });
});
