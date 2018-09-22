import * as sinon from 'sinon';
import { expect } from 'chai';
import { ExceptionsHandler } from '../../exceptions/exceptions-handler';
import { Logger } from '../../../common/services/logger.service';
import { NestEnvironment } from '../../../common/enums/nest-environment.enum';
import { InvalidExceptionFilterException } from '../../errors/exceptions/invalid-exception-filter.exception';
import { HttpException } from '@nestjs/common';
import { ExpressAdapter } from '../../adapters/express-adapter';
import { ExecutionContextHost } from '../../helpers/execution-context.host';

describe('ExceptionsHandler', () => {
  let handler: ExceptionsHandler;
  let statusStub: sinon.SinonStub;
  let jsonStub: sinon.SinonStub;
  let response;

  before(() => Logger.setMode(NestEnvironment.TEST));

  beforeEach(() => {
    handler = new ExceptionsHandler(new ExpressAdapter({}));
    statusStub = sinon.stub();
    jsonStub = sinon.stub();

    response = {
      status: statusStub,
      json: jsonStub,
    };
    response.status.returns(response);
    response.json.returns(response);
  });

  describe('next', () => {
    it('should method send expected response status code and message when exception is unknown', () => {
      handler.next(new Error(), new ExecutionContextHost([0, response]));

      expect(statusStub.calledWith(500)).to.be.true;
      expect(
        jsonStub.calledWith({
          statusCode: 500,
          message: 'Internal server error',
        }),
      ).to.be.true;
    });
    describe('when exception is instance of HttpException', () => {
      it('should method send expected response status code and json object', () => {
        const status = 401;
        const message = {
          custom: 'Unauthorized',
        };
        handler.next(
          new HttpException(message, status),
          new ExecutionContextHost([0, response]),
        );

        expect(statusStub.calledWith(status)).to.be.true;
        expect(jsonStub.calledWith(message)).to.be.true;
      });
      it('should method send expected response status code and transform message to json', () => {
        const status = 401;
        const message = 'Unauthorized';

        handler.next(
          new HttpException(message, status),
          new ExecutionContextHost([0, response]),
        );

        expect(statusStub.calledWith(status)).to.be.true;
        expect(jsonStub.calledWith({ message, statusCode: status })).to.be.true;
      });
    });
    describe('when "invokeCustomFilters" returns true', () => {
      beforeEach(() => {
        sinon.stub(handler, 'invokeCustomFilters').returns(true);
      });
      it('should not call status and json stubs', () => {
        expect(statusStub.notCalled).to.be.true;
        expect(jsonStub.notCalled).to.be.true;
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
      expect(() => handler.setCustomFilters(null)).to.throws(
        InvalidExceptionFilterException,
      );
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

          handler.invokeCustomFilters(exception, res);
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
