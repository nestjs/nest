import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';

import { RequestChainModule } from '../src/request-chain/request-chain.module';
import { RequestChainService } from '../src/request-chain/request-chain.service';

describe('Request scope (modules propagation)', () => {
  let server;
  let app: INestApplication;

  before(async () => {
    const module = await Test.createTestingModule({
      imports: [RequestChainModule],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpServer();
    await app.init();
  });

  describe('when service from parent module is request scoped', () => {
    before(async () => {
      const performHttpCall = end =>
        request(server)
          .get('/hello')
          .end((err, res) => {
            if (err) return end(err);
            end();
          });
      await new Promise(resolve => performHttpCall(resolve));
      await new Promise(resolve => performHttpCall(resolve));
      await new Promise(resolve => performHttpCall(resolve));
    });

    it(`should not fail`, async () => {
      expect(RequestChainService.COUNTER).to.be.eql(3);
    });
  });

  after(async () => {
    await app.close();
  });
});
