import { INestApplication, Logger } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as sinon from 'sinon';
import * as request from 'supertest';
import { HelloModule } from '../src/inject-inquirer/hello.module';

describe('Inject Inquirer', () => {
  let logger: Record<string, any>;
  let server: any;
  let app: INestApplication;

  beforeEach(async () => {
    logger = { log: sinon.spy() };

    const module = await Test.createTestingModule({
      imports: [HelloModule],
    })
      .overrideProvider(Logger)
      .useValue(logger)
      .compile();

    app = module.createNestApplication();
    server = app.getHttpServer();
    await app.init();
  });

  it(`should allow the injection of inquirer in a Transient Scope`, async () => {
    await request(server).get('/hello/transient');

    expect(
      logger.log.calledWith({
        message: 'Hello transient!',
        feature: 'transient',
      }),
    ).to.be.true;
  });

  it(`should allow the injection of the inquirer in a Request Scope`, async () => {
    await request(server).get('/hello/request');

    expect(
      logger.log.calledWith({
        message: 'Hello request!',
        requestId: sinon.match.string,
        feature: 'request',
      }),
    ).to.be.true;

    const requestId = logger.log.getCall(0).args[0].requestId;

    expect(
      logger.log.calledWith({
        message: 'Goodbye request!',
        requestId,
        feature: 'request',
      }),
    );
  });

  afterEach(async () => {
    await app.close();
  });
});
