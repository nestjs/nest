import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import chai, { expect } from 'chai';
import chaiAsPromised from 'chai-as-promised';
import { AppModule } from '../src/app.module.js';
chai.use(chaiAsPromised);

describe('Lazy imports', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
  });

  it(`should allow imports of global modules`, async () => {
    await expect(app.init()).to.eventually.be.fulfilled;
  });

  afterEach(async () => {
    await app.close();
  });
});
