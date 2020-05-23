import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from './config.service';
import { CONFIG_OPTIONS } from './constants';

jest.mock('dotenv');
jest.mock('fs');

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        {
          provide: CONFIG_OPTIONS,
          useValue: {
            folder: 'config',
          },
        },
      ],
    }).compile();

    service = moduleRef.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
