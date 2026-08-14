import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module.js';

describe('Lazy imports', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
  });

  it(`should allow imports of global modules`, async () => {
    await expect(app.init()).resolves.toBeDefined();
  });

  afterEach(async () => {
    await app.close();
  });
});
