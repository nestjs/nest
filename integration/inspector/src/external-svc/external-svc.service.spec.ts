import { Test, TestingModule } from '@nestjs/testing';
import { ExternalSvcService } from './external-svc.service';

describe('ExternalSvcService', () => {
  let service: ExternalSvcService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ExternalSvcService],
    }).compile();

    service = module.get<ExternalSvcService>(ExternalSvcService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
