import { Test, TestingModule } from '@nestjs/testing';

jest.mock('dotenv');
jest.mock('fs');

import { ConfigService } from './config.service';
import { CONFIG_OPTIONS } from './constants';

describe('ConfigService', () => {
  let service: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
