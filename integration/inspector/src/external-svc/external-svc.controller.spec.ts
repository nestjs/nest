import { Test, TestingModule } from '@nestjs/testing';
import { ExternalSvcController } from './external-svc.controller';
import { ExternalSvcService } from './external-svc.service';

describe('ExternalSvcController', () => {
  let controller: ExternalSvcController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ExternalSvcController],
      providers: [ExternalSvcService],
    }).compile();

    controller = module.get<ExternalSvcController>(ExternalSvcController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
