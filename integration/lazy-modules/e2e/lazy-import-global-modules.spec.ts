import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as chai from 'chai';
import { expect } from 'chai';
import chaiAsPromised = require('chai-as-promised');
import { AppModule } from '../src/app.module';
chai.use(chaiAsPromised);

describe('Lazy imports', () => {
  let server;
  let app: INestApplication;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpAdapter().getInstance();
  });

  it(`should allow imports of global modules`, async () => {
    await expect(app.init()).to.eventually.be.fulfilled;
  });

  afterEach(async () => {
    await app.close();
  });
});
