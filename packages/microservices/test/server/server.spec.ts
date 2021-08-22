import { lastValueFrom, Observable, of, throwError as _throw } from 'rxjs';
import * as sinon from 'sinon';
import { Server } from '../../server/server';

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
      sandbox
        .stub(server as any, 'messageHandlers')
        .value({ set() {}, has() {} });

      const messageHandlersSetSpy = sinon.spy(
        (server as any).messageHandlers,
        'set',
      );
      const normalizePatternStub = sinon
        .stub(server as any, 'normalizePattern')
        .returns(handlerRoute);

      server.addHandler(pattern, callback as any);

      expect(messageHandlersSetSpy.called).toBeTruthy();
      expect(messageHandlersSetSpy.args[0][0]).toEqual(handlerRoute);
      expect(messageHandlersSetSpy.args[0][1]).toEqual(callback);

      normalizePatternStub.restore();
    });
    describe('when handler is an event handler', () => {
      describe('and there are other handlers registered for the pattern already', () => {
        it('should find tail and assign a handler ref to it', () => {
          const handlerRoute = 'hello';
          const headHandler: any = () => null;
          const nextHandler: any = () => null;

          headHandler.next = nextHandler;
          (server as any)['messageHandlers'] = new Map([
            [handlerRoute, headHandler],
          ]);
          const normalizePatternStub = sinon
            .stub(server as any, 'normalizePattern')
            .returns(handlerRoute);

          server.addHandler(pattern, callback as any, true);

          expect(nextHandler.next).toEqual(callback);
          normalizePatternStub.restore();
        });
      });
    });
  });

  describe('getRouteFromPattern', () => {
    let normalizePatternStub: sinon.SinonStub;

    beforeEach(() => {
      normalizePatternStub = sinon.stub(server as any, 'normalizePattern');
    });

    afterEach(() => {
      normalizePatternStub.restore();
    });

    describe(`when gets 'string' pattern`, () => {
      it(`should call 'transformPatternToRoute' with 'string' argument`, () => {
        const inputServerPattern = 'hello';
        const transformedServerPattern = inputServerPattern;
        (server as any).getRouteFromPattern(inputServerPattern);

        expect(normalizePatternStub.args[0][0]).toEqual(
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

        expect(normalizePatternStub.args[0][0]).toEqual(
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
        it('should send error and complete', (done) => {
          process.nextTick(() => {
            expect(
              sendSpy.calledWith({
                err: 'test',
                isDisposed: true,
              }),
            ).toBeTruthy();
            done();
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
            ).toBeTruthy();
          });
        });
      });
    });
  });
  describe('transformToObservable', () => {
    describe('when resultOrDeferred', () => {
      describe('is Promise', () => {
        it('should return Observable', async () => {
          const value = 100;
          expect(
            await lastValueFrom(
              server.transformToObservable(Promise.resolve(value)),
            ),
          ).toEqual(100);
        });
      });
      describe('is Observable', () => {
        it('should return Observable', async () => {
          const value = 100;
          expect(
            await lastValueFrom(server.transformToObservable(of(value))),
          ).toEqual(100);
        });
      });
      describe('is value', () => {
        it('should return Observable', async () => {
          const value = 100;
          expect(
            await lastValueFrom(server.transformToObservable(value)),
          ).toEqual(100);
        });
      });
    });
  });

  describe('getHandlers', () => {
    it('should return registered handlers', () => {
      const messageHandlers = [() => null, () => true];
      sandbox.stub(server as any, 'messageHandlers').value(messageHandlers);
      expect(server.getHandlers()).toEqual(messageHandlers);
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

        expect(messageHandlersHasSpy.args[0][0]).toEqual(handlerRoute);
        expect(messageHandlersGetSpy.called).toBeTruthy();
        expect(messageHandlersGetSpy.args[0][0]).toEqual(handlerRoute);
        expect(value).toEqual(callback);
      });
    });

    describe('when handler does not exists', () => {
      it('should return null', () => {
        messageHandlersHasSpy.returns(false);

        const value = server.getHandlerByPattern(handlerRoute);

        expect(messageHandlersHasSpy.args[0][0]).toEqual(handlerRoute);
        expect(messageHandlersGetSpy.called).toBeFalsy();
        expect(value).toBe(null);
      });
    });
  });
});
