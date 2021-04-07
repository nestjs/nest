import { ExecutionContextHost } from '@nestjs/core/helpers/execution-context-host';
import { expect } from 'chai';
import * as sinon from 'sinon';

import { WsException } from '../../errors/ws-exception';
import { WsExceptionsHandler } from '../../exceptions/ws-exceptions-handler';

describe('WsExceptionsHandler', () => {
  let handler: WsExceptionsHandler;
  let emitStub: sinon.SinonStub;
  let client;

  beforeEach(() => {
    handler = new WsExceptionsHandler();
    emitStub = sinon.stub();
    client = {
      emit: emitStub,
    };
    client.emit.returns(client);
  });

  describe('handle', () => {
    it('should method emit expected status code message when exception is unknown', () => {
      handler.handle(new Error(), new ExecutionContextHost([client]));
      expect(
        emitStub.calledWith('exception', {
          status: 'error',
          message: 'Internal server error',
        }),
      ).to.be.true;
    });
    describe('when exception is instance of WsException', () => {
      it('should method emit expected status and json object', () => {
        const message = {
          custom: 'Unauthorized',
        };
        handler.handle(
          new WsException(message),
          new ExecutionContextHost([client]),
        );
        expect(emitStub.calledWith('exception', message)).to.be.true;
      });
      it('should method emit expected status and transform message to json', () => {
        const message = 'Unauthorized';

        handler.handle(
          new WsException(message),
          new ExecutionContextHost([client]),
        );
        expect(emitStub.calledWith('exception', { message, status: 'error' }))
          .to.be.true;
      });
    });
    describe('when "invokeCustomFilters" returns true', () => {
      beforeEach(() => {
        sinon.stub(handler, 'invokeCustomFilters').returns(true);
      });
      it('should not call `emit`', () => {
        handler.handle(new WsException(''), new ExecutionContextHost([client]));
        expect(emitStub.notCalled).to.be.true;
      });
    });
  });
  describe('setCustomFilters', () => {
    const filters = ['test', 'test2'];
    it('should set custom filters', () => {
      handler.setCustomFilters(filters as any);
      expect((handler as any).filters).to.be.eql(filters);
    });
    it('should throws exception when passed argument is not an array', () => {
      expect(() => handler.setCustomFilters(null)).to.throw();
    });
  });
  describe('invokeCustomFilters', () => {
    describe('when filters array is empty', () => {
      it('should returns false', () => {
        expect(handler.invokeCustomFilters(null, null)).to.be.false;
      });
    });
    describe('when filters array is not empty', () => {
      let filters, funcSpy;
      class TestException {}

      beforeEach(() => {
        funcSpy = sinon.spy();
      });
      describe('when filter exists in filters array', () => {
        beforeEach(() => {
          filters = [{ exceptionMetatypes: [TestException], func: funcSpy }];
          (handler as any).filters = filters;
        });
        it('should call funcSpy', () => {
          handler.invokeCustomFilters(new TestException(), null);
          expect(funcSpy.notCalled).to.be.false;
        });
        it('should call funcSpy with exception and response passed as an arguments', () => {
          const exception = new TestException();
          const res = { foo: 'bar' };

          handler.invokeCustomFilters(exception, res as any);
          expect(funcSpy.calledWith(exception, res)).to.be.true;
        });
        it('should returns true', () => {
          expect(handler.invokeCustomFilters(new TestException(), null)).to.be
            .true;
        });
      });
      describe('when filter does not exists in filters array', () => {
        it('should not call funcSpy', () => {
          handler.invokeCustomFilters(new TestException(), null);
          expect(funcSpy.notCalled).to.be.true;
        });
        it('should returns false', () => {
          expect(handler.invokeCustomFilters(new TestException(), null)).to.be
            .false;
        });
      });
    });
  });
});
