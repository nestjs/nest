import { expect } from 'chai';
import { Observable, of, throwError as _throw } from 'rxjs';
import * as sinon from 'sinon';
import { Server } from '../../server/server';
import * as Utils from '../../utils';

class TestServer extends Server {
  public listen(callback: () => void) {}
  public close() {}
}

describe('Server', () => {
  const server = new TestServer();
  const sandbox = sinon.createSandbox();
  const callback = () => {},
    pattern = { test: 'test pattern' };

  afterEach(() => {
    sandbox.restore();
  });

  describe('addHandler', () => {
    it(`should add handler`, () => {
      const handlerRoute = 'hello';
      sandbox.stub(server as any, 'messageHandlers').value({ set() {} });

      const messageHandlersSetSpy = sinon.spy(
        (server as any).messageHandlers,
        'set',
      );
      const msvcUtilTransformPatternToRouteStub = sinon
        .stub(Utils, 'transformPatternToRoute')
        .returns(handlerRoute);

      server.addHandler(pattern, callback as any);

      expect(messageHandlersSetSpy.called).to.be.true;
      expect(messageHandlersSetSpy.args[0][0]).to.be.equal(handlerRoute);
      expect(messageHandlersSetSpy.args[0][1]).to.be.equal(callback);

      msvcUtilTransformPatternToRouteStub.restore();
    });
  });

  describe('getRouteFromPattern', () => {
    let msvcUtilTransformPatternToRouteStub: sinon.SinonSpy;

    beforeEach(() => {
      msvcUtilTransformPatternToRouteStub = sinon.spy(
        Utils,
        'transformPatternToRoute',
      );
    });

    afterEach(() => {
      msvcUtilTransformPatternToRouteStub.restore();
    });

    describe(`when gets 'string' pattern`, () => {
      it(`should call 'transformPatternToRoute' with 'string' argument`, () => {
        const inputServerPattern = 'hello';
        const transformedServerPattern = inputServerPattern;
        (server as any).getRouteFromPattern(inputServerPattern);

        expect(msvcUtilTransformPatternToRouteStub.args[0][0]).to.be.equal(
          transformedServerPattern,
        );
      });
    });

    describe(`when gets 'json' pattern as 'string'`, () => {
      it(`should call 'transformPatternToRoute' with 'json' argument`, () => {
        const inputServerPattern = '{"controller":"app","use":"getHello"}';
        const transformedServerPattern = {
          controller: 'app',
          use: 'getHello',
        };
        (server as any).getRouteFromPattern(inputServerPattern);

        expect(msvcUtilTransformPatternToRouteStub.args[0][0]).to.be.deep.equal(
          transformedServerPattern,
        );
      });
    });
  });

  describe('send', () => {
    let stream$: Observable<string>;
    let sendSpy: sinon.SinonSpy;
    beforeEach(() => {
      stream$ = of('test');
    });
    describe('when stream', () => {
      beforeEach(() => {
        sendSpy = sinon.spy();
      });
      describe('throws exception', () => {
        beforeEach(() => {
          server.send(_throw('test') as any, sendSpy);
        });
        it('should send error and complete', () => {
          process.nextTick(() => {
            expect(
              sendSpy.calledWith({
                err: 'test',
                isDisposed: true,
              }),
            ).to.be.true;
          });
        });
      });
      describe('emits response', () => {
        beforeEach(() => {
          server.send(stream$, sendSpy);
        });
        it('should send response and "complete" event', () => {
          process.nextTick(() => {
            expect(
              sendSpy.calledWith({
                response: 'test',
                isDisposed: true,
              }),
            ).to.be.true;
          });
        });
      });
    });
  });
  describe('transformToObservable', () => {
    describe('when resultOrDeffered', () => {
      describe('is Promise', () => {
        it('should returns Observable', async () => {
          const value = 100;
          expect(
            await server
              .transformToObservable(Promise.resolve(value))
              .toPromise(),
          ).to.be.eq(100);
        });
      });
      describe('is Observable', () => {
        it('should returns Observable', async () => {
          const value = 100;
          expect(
            await server.transformToObservable(of(value)).toPromise(),
          ).to.be.eq(100);
        });
      });
      describe('is value', () => {
        it('should returns Observable', async () => {
          const value = 100;
          expect(
            await server.transformToObservable(value).toPromise(),
          ).to.be.eq(100);
        });
      });
    });
  });

  describe('getHandlerByPattern', () => {
    let messageHandlersGetSpy: sinon.SinonStub;
    let messageHandlersHasSpy: sinon.SinonStub;
    const handlerRoute = 'hello';

    beforeEach(() => {
      sandbox
        .stub(server as any, 'messageHandlers')
        .value({ get() {}, has() {} });
      messageHandlersGetSpy = sinon
        .stub((server as any).messageHandlers, 'get')
        .returns(callback);
      messageHandlersHasSpy = sinon.stub(
        (server as any).messageHandlers,
        'has',
      );

      sandbox.stub(server as any, 'getRouteFromPattern').returns(handlerRoute);
    });

    afterEach(() => {
      messageHandlersGetSpy.restore();
      messageHandlersHasSpy.restore();
    });

    describe('when handler exists', () => {
      it('should return expected handler', () => {
        messageHandlersHasSpy.returns(true);

        const value = server.getHandlerByPattern(handlerRoute);

        expect(messageHandlersHasSpy.args[0][0]).to.be.equal(handlerRoute);
        expect(messageHandlersGetSpy.called).to.be.true;
        expect(messageHandlersGetSpy.args[0][0]).to.be.equal(handlerRoute);
        expect(value).to.be.equal(callback);
      });
    });

    describe('when handler does not exists', () => {
      it('should return null', () => {
        messageHandlersHasSpy.returns(false);

        const value = server.getHandlerByPattern(handlerRoute);

        expect(messageHandlersHasSpy.args[0][0]).to.be.equal(handlerRoute);
        expect(messageHandlersGetSpy.called).to.be.false;
        expect(value).to.be.null;
      });
    });
  });
});
