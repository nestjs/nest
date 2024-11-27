import { expect } from 'chai';
import { throwError as _throw, lastValueFrom, Observable, of } from 'rxjs';
import * as sinon from 'sinon';
import { Server } from '../../server/server';

class TestServer extends Server {
  public on<
    EventKey extends string = string,
    EventCallback extends Function = Function,
  >(event: EventKey, callback: EventCallback) {}
  public unwrap<T>(): T {
    return null!;
  }
  public listen(callback: () => void) {}
  public close() {}
}

describe('Server', () => {
  const server = new TestServer();
  const untypedServer = server as any;
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
        untypedServer.messageHandlers,
        'set',
      );
      const normalizePatternStub = sinon
        .stub(server as any, 'normalizePattern')
        .returns(handlerRoute);

      server.addHandler(pattern, callback as any);

      expect(messageHandlersSetSpy.called).to.be.true;
      expect(messageHandlersSetSpy.args[0][0]).to.be.equal(handlerRoute);
      expect(messageHandlersSetSpy.args[0][1]).to.be.equal(callback);

      normalizePatternStub.restore();
    });
    describe('when handler is an event handler', () => {
      describe('and there are other handlers registered for the pattern already', () => {
        it('should find tail and assign a handler ref to it', () => {
          const handlerRoute = 'hello';
          const headHandler: any = () => null;
          const nextHandler: any = () => null;

          headHandler.next = nextHandler;
          untypedServer['messageHandlers'] = new Map([
            [handlerRoute, headHandler],
          ]);
          const normalizePatternStub = sinon
            .stub(server as any, 'normalizePattern')
            .returns(handlerRoute);

          server.addHandler(pattern, callback as any, true);

          expect(nextHandler.next).to.equal(callback);
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
        untypedServer.getRouteFromPattern(inputServerPattern);

        expect(normalizePatternStub.args[0][0]).to.be.equal(
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
        untypedServer.getRouteFromPattern(inputServerPattern);

        expect(normalizePatternStub.args[0][0]).to.be.deep.equal(
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
          server.send(_throw(() => 'test') as any, sendSpy);
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
    describe('when resultOrDeferred', () => {
      describe('is Promise', () => {
        it('should return Observable that emits the resolved value of the supplied promise', async () => {
          const value = 100;
          expect(
            await lastValueFrom(
              server.transformToObservable(Promise.resolve(value)),
            ),
          ).to.be.eq(100);
        });
      });
      describe('is Observable', () => {
        it('should return the observable itself', async () => {
          const value = 100;
          expect(
            await lastValueFrom(server.transformToObservable(of(value))),
          ).to.be.eq(100);
        });
      });
      describe('is any number', () => {
        it('should return Observable that emits the supplied number', async () => {
          const value = 100;
          expect(
            await lastValueFrom(server.transformToObservable(value)),
          ).to.be.eq(100);
        });
      });
      describe('is an array', () => {
        it('should return Observable that emits the supplied array', async () => {
          const value = [1, 2, 3];
          expect(
            await lastValueFrom(server.transformToObservable(value)),
          ).to.be.eq(value);
        });
      });
    });
  });

  describe('getHandlers', () => {
    it('should return registered handlers', () => {
      const messageHandlers = [() => null, () => true];
      sandbox.stub(server as any, 'messageHandlers').value(messageHandlers);
      expect(server.getHandlers()).to.equal(messageHandlers);
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
        .stub(untypedServer.messageHandlers, 'get')
        .returns(callback);
      messageHandlersHasSpy = sinon.stub(untypedServer.messageHandlers, 'has');

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
