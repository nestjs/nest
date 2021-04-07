import { expect } from 'chai';
import * as sinon from 'sinon';

import { HttpException } from '../../../common/exceptions/http.exception';
import { ExternalExceptionsHandler } from '../../exceptions/external-exceptions-handler';
import { ExternalErrorProxy } from '../../helpers/external-proxy';

describe('ExternalErrorProxy', () => {
  let externalErrorProxy: ExternalErrorProxy;
  let handlerMock: sinon.SinonMock;
  let handler: ExternalExceptionsHandler;

  beforeEach(() => {
    handler = new ExternalExceptionsHandler();
    handlerMock = sinon.mock(handler);
    externalErrorProxy = new ExternalErrorProxy();
  });

  describe('createProxy', () => {
    it('should method return thunk', () => {
      const proxy = externalErrorProxy.createProxy(() => {}, handler);
      expect(typeof proxy === 'function').to.be.true;
    });

    it('should method encapsulate callback passed as argument', () => {
      const expectation = handlerMock.expects('next').once();
      const proxy = externalErrorProxy.createProxy((req, res, next) => {
        throw new HttpException('test', 500);
      }, handler);
      proxy(null, null, null);
      expectation.verify();
    });

    it('should method encapsulate async callback passed as argument', done => {
      const expectation = handlerMock.expects('next').once();
      const proxy = externalErrorProxy.createProxy(async (req, res, next) => {
        throw new HttpException('test', 500);
      }, handler);
      proxy(null, null, null);

      setTimeout(() => {
        expectation.verify();
        done();
      }, 0);
    });
  });
});
