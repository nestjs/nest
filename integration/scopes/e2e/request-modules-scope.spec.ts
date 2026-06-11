import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import * as request from 'supertest';
import { RequestChainModule } from '../src/request-chain/request-chain.module';
import { RequestChainService } from '../src/request-chain/request-chain.service';

describe('Request scope (modules propagation)', () => {
  const OVERLAP_REQUEST_COUNT = 1000;
  let server;
  let app: INestApplication;
  let baseUrl: string;

  before(async () => {
    const module = await Test.createTestingModule({
      imports: [RequestChainModule],
    }).compile();

    app = module.createNestApplication();
    server = app.getHttpServer();
    await app.listen(0);
    baseUrl = await app.getUrl();
  });

  describe('when service from parent module is request scoped', () => {
    before(async () => {
      const performHttpCall = end =>
        request(server)
          .get('/hello')
          .end(err => {
            if (err) return end(err);
            end();
          });
      await new Promise<any>(resolve => performHttpCall(resolve));
      await new Promise<any>(resolve => performHttpCall(resolve));
      await new Promise<any>(resolve => performHttpCall(resolve));
    });

    it(`should not fail`, () => {
      expect(RequestChainService.COUNTER).to.be.eql(3);
    });
  });

  describe('when service from parent module is request scoped under overlapping requests', function () {
    this.timeout(20000);
    let counterBefore: number;
    let responses: request.Response[];

    before(async () => {
      counterBefore = RequestChainService.COUNTER;
      responses = await Promise.all(
        Array.from({ length: OVERLAP_REQUEST_COUNT }, () =>
          request(baseUrl).get('/hello'),
        ),
      );
    });

    it('should complete every overlapping request successfully', () => {
      expect(responses.map(response => response.status)).to.deep.equal(
        Array.from({ length: OVERLAP_REQUEST_COUNT }, () => 200),
      );
    });

    it('should create the request-scoped dependency chain for every overlapping request', () => {
      expect(RequestChainService.COUNTER - counterBefore).to.equal(
        OVERLAP_REQUEST_COUNT,
      );
    });
  });

  after(async () => {
    await app.close();
  });
});
