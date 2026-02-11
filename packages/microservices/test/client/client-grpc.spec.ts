import { Logger } from '@nestjs/common';
import { join } from 'path';
import { Observable, Subject } from 'rxjs';
import { ClientGrpcProxy } from '../../client/index.js';
import { InvalidGrpcPackageException } from '../../errors/invalid-grpc-package.exception.js';
import { InvalidGrpcServiceException } from '../../errors/invalid-grpc-service.exception.js';
import { InvalidProtoDefinitionException } from '../../errors/invalid-proto-definition.exception.js';

class NoopLogger extends Logger {
  log(message: any, context?: string): void {}
  error(message: any, trace?: string, context?: string): void {}
  warn(message: any, context?: string): void {}
}

class GrpcService {
  test = null;
  test2 = null;
}

describe('ClientGrpcProxy', () => {
  let client: ClientGrpcProxy;
  let untypedClient: any;
  let clientMulti: ClientGrpcProxy;

  beforeEach(() => {
    client = new ClientGrpcProxy({
      protoPath: join(import.meta.dirname, './test.proto'),
      package: 'test',
    });
    untypedClient = client as any;

    clientMulti = new ClientGrpcProxy({
      protoPath: ['test.proto', 'test2.proto'],
      package: ['test', 'test2'],
      loader: {
        includeDirs: [join(import.meta.dirname, '.')],
      },
    });
  });

  describe('getService', () => {
    describe('when "grpcClient[name]" is nil', () => {
      it('should throw "InvalidGrpcServiceException"', () => {
        untypedClient.grpcClient = {};
        expect(() => client.getService('test')).toThrow(
          InvalidGrpcServiceException,
        );
      });

      it('should throw "InvalidGrpcServiceException" (multiple proto)', () => {
        (clientMulti as any).grpcClient = {};

        expect(() => clientMulti.getService('test')).toThrow(
          InvalidGrpcServiceException,
        );

        expect(() => clientMulti.getService('test2')).toThrow(
          InvalidGrpcServiceException,
        );
      });
    });
    describe('when "grpcClient[name]" is not nil', () => {
      it('should create grpcService', async () => {
        untypedClient.grpcClients[0] = {
          test: GrpcService,
        };
        await client.getService('test'); // should not throw
      });

      describe('when "grpcClient[name]" is not nil (multiple proto)', () => {
        it('should create grpcService', async () => {
          (clientMulti as any).grpcClients[0] = {
            test: GrpcService,
            test2: GrpcService,
          };
          await clientMulti.getService('test'); // should not throw
          await clientMulti.getService('test2'); // should not throw
        });
      });
    });
  });

  describe('createServiceMethod', () => {
    const methodName = 'test';
    describe('when method is a response stream', () => {
      it('should call "createStreamServiceMethod"', () => {
        const cln = { [methodName]: { responseStream: true } };
        const spy = vi.spyOn(client, 'createStreamServiceMethod');
        client.createServiceMethod(cln, methodName);

        expect(spy).toHaveBeenCalled();
      });
    });
    describe('when method is not a response stream', () => {
      it('should call "createUnaryServiceMethod"', () => {
        const cln = { [methodName]: { responseStream: false } };
        const spy = vi.spyOn(client, 'createUnaryServiceMethod');
        client.createServiceMethod(cln, methodName);

        expect(spy).toHaveBeenCalled();
      });
    });
  });

  describe('createStreamServiceMethod', () => {
    it('should return observable', () => {
      const methodKey = 'method';
      const fn = client.createStreamServiceMethod(
        { [methodKey]: {} },
        methodKey,
      );
      expect(fn()).toBeInstanceOf(Observable);
    });
    describe('on subscribe', () => {
      const methodName = 'm';
      const obj = { [methodName]: () => ({ on: (type, fn) => fn() }) };

      let stream$: Observable<any>;

      beforeEach(() => {
        stream$ = client.createStreamServiceMethod(obj, methodName)();
      });

      it('should call native method', () => {
        const spy = vi.spyOn(obj, methodName);
        stream$.subscribe({
          next: () => ({}),
          error: () => ({}),
        });

        expect(spy).toHaveBeenCalled();
      });
    });

    describe('when stream request', () => {
      const methodName = 'm';
      const writeSpy = vi.fn();
      const obj = {
        [methodName]: () => ({ on: (type, fn) => fn(), write: writeSpy }),
      };

      let stream$: Observable<any>;
      let upstream: Subject<unknown>;

      beforeEach(() => {
        upstream = new Subject();
        (obj[methodName] as any).requestStream = true;
        stream$ = client.createStreamServiceMethod(obj, methodName)(upstream);
      });

      it('should subscribe to request upstream', () => {
        const upstreamSubscribe = vi.spyOn(upstream, 'subscribe');
        stream$.subscribe({
          next: () => ({}),
          error: () => ({}),
        });
        upstream.next({ test: true });

        expect(writeSpy).toHaveBeenCalled();
        expect(upstreamSubscribe).toHaveBeenCalled();
      });
    });

    describe('flow-control', () => {
      const methodName = 'm';
      type EvtCallback = (...args: any[]) => void;
      let callMock: {
        on: (type: string, fn: EvtCallback) => void;
        cancel: ReturnType<typeof vi.fn>;
        finished: boolean;
        destroy: ReturnType<typeof vi.fn>;
        removeAllListeners: ReturnType<typeof vi.fn>;
      };
      let eventCallbacks: { [type: string]: EvtCallback };
      let obj, dataSpy, errorSpy, completeSpy;

      let stream$: Observable<any>;

      beforeEach(() => {
        dataSpy = vi.fn();
        errorSpy = vi.fn();
        completeSpy = vi.fn();

        eventCallbacks = {};
        callMock = {
          on: (type, fn) => (eventCallbacks[type] = fn),
          cancel: vi.fn(),
          finished: false,
          destroy: vi.fn(),
          removeAllListeners: vi.fn(),
        };
        obj = { [methodName]: () => callMock };
        stream$ = client.createStreamServiceMethod(obj, methodName)();
      });

      it('propagates server errors', () => {
        const err = new Error('something happened');
        stream$.subscribe({
          next: dataSpy,
          error: errorSpy,
          complete: completeSpy,
        });

        eventCallbacks.data('a');
        eventCallbacks.data('b');
        callMock.finished = true;
        eventCallbacks.error(err);
        eventCallbacks.data('c');

        expect(Object.keys(eventCallbacks).length).toBe(3);
        expect(dataSpy.mock.calls).toEqual([['a'], ['b']]);
        expect(errorSpy.mock.calls[0][0]).toEqual(err);
        expect(completeSpy).not.toHaveBeenCalled();
        expect(callMock.cancel).not.toHaveBeenCalled();
      });

      it('handles client side cancel', () => {
        const grpcServerCancelErrMock = {
          details: 'Cancelled',
        };
        const subscription = stream$.subscribe({
          next: dataSpy,
          error: errorSpy,
        });

        eventCallbacks.data('a');
        eventCallbacks.data('b');
        subscription.unsubscribe();
        eventCallbacks.error(grpcServerCancelErrMock);
        eventCallbacks.end();
        eventCallbacks.data('c');

        expect(callMock.cancel).toHaveBeenCalled();
        expect(callMock.destroy).toHaveBeenCalled();
        expect(dataSpy.mock.calls).toEqual([['a'], ['b']]);
        expect(errorSpy).not.toHaveBeenCalled();
      });
    });
  });

  describe('createUnaryServiceMethod', () => {
    it('should return observable', () => {
      const methodKey = 'method';
      const fn = client.createUnaryServiceMethod(
        { [methodKey]: {} },
        methodKey,
      );
      expect(fn()).toBeInstanceOf(Observable);
    });
    describe('on subscribe', () => {
      const methodName = 'm';
      const obj = {
        [methodName]: callback => {
          callback(null, {});

          return {
            finished: true,
          };
        },
      };

      let stream$: Observable<any>;

      beforeEach(() => {
        stream$ = client.createUnaryServiceMethod(obj, methodName)();
      });

      it('should call native method', () => {
        const spy = vi.spyOn(obj, methodName);
        stream$.subscribe({
          next: () => ({}),
          error: () => ({}),
        });

        expect(spy).toHaveBeenCalled();
      });
    });
    describe('when stream request', () => {
      let clientCallback: (
        err: Error | null | undefined,
        response: any,
      ) => void;
      const writeSpy = vi.fn();
      const methodName = 'm';

      const callMock = {
        cancel: vi.fn(),
        finished: false,
        write: writeSpy,
      };

      const obj = {
        [methodName]: callback => {
          clientCallback = callback;
          return callMock;
        },
      };

      let stream$: Observable<any>;
      let upstream: Subject<unknown>;

      beforeEach(() => {
        upstream = new Subject();
        (obj[methodName] as any).requestStream = true;
        stream$ = client.createUnaryServiceMethod(obj, methodName)(upstream);
      });

      afterEach(() => {
        clientCallback(null, {});
      });

      it('should subscribe to request upstream', () => {
        const upstreamSubscribe = vi.spyOn(upstream, 'subscribe');
        stream$.subscribe({
          next: () => ({}),
          error: () => ({}),
        });
        upstream.next({ test: true });

        expect(writeSpy).toHaveBeenCalled();
        expect(upstreamSubscribe).toHaveBeenCalled();
      });
    });

    describe('flow-control', () => {
      it('should cancel call on client unsubscribe', () => {
        const methodName = 'm';

        const dataSpy = vi.fn();
        const errorSpy = vi.fn();
        const completeSpy = vi.fn();

        const callMock = {
          cancel: vi.fn(),
          finished: false,
        };

        let handler: (error: any, data: any) => void;

        const obj = {
          [methodName]: (callback, ...args) => {
            handler = callback;

            return callMock;
          },
        };

        const stream$ = client.createUnaryServiceMethod(obj, methodName)();

        const subscription = stream$.subscribe({
          next: dataSpy,
          error: errorSpy,
          complete: completeSpy,
        });

        subscription.unsubscribe();
        handler!(null, 'a');

        expect(dataSpy).not.toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
        expect(completeSpy).not.toHaveBeenCalled();
        expect(callMock.cancel).toHaveBeenCalled();
      });

      it('should cancel call on client unsubscribe case client streaming', () => {
        const methodName = 'm';

        const dataSpy = vi.fn();
        const errorSpy = vi.fn();
        const completeSpy = vi.fn();
        const writeSpy = vi.fn();

        const callMock = {
          cancel: vi.fn(),
          finished: false,
          write: writeSpy,
        };

        let handler: (error: any, data: any) => void;
        const obj = {
          [methodName]: callback => {
            handler = callback;
            return callMock;
          },
        };

        (obj[methodName] as any).requestStream = true;
        const upstream: Subject<unknown> = new Subject();
        const stream$: Observable<any> = client.createUnaryServiceMethod(
          obj,
          methodName,
        )(upstream);

        const upstreamSubscribe = vi.spyOn(upstream, 'subscribe');
        stream$.subscribe({
          next: () => ({}),
          error: () => ({}),
        });
        upstream.next({ test: true });

        const subscription = stream$.subscribe({
          next: dataSpy,
          error: errorSpy,
          complete: completeSpy,
        });

        subscription.unsubscribe();
        handler!(null, 'a');

        expect(dataSpy).not.toHaveBeenCalled();
        expect(writeSpy).toHaveBeenCalled();
        expect(errorSpy).not.toHaveBeenCalled();
        expect(completeSpy).not.toHaveBeenCalled();
        expect(callMock.cancel).toHaveBeenCalled();
        expect(upstreamSubscribe).toHaveBeenCalled();
      });
    });
  });

  describe('createClients', () => {
    describe('when package does not exist', () => {
      it('should throw "InvalidGrpcPackageException"', () => {
        vi.spyOn(client, 'lookupPackage').mockImplementation(() => null);
        untypedClient.logger = new NoopLogger();

        try {
          client.createClients();
        } catch (err) {
          expect(err).toBeInstanceOf(InvalidGrpcPackageException);
        }
      });
    });
  });

  describe('loadProto', () => {
    describe('when proto is invalid', () => {
      it('should throw InvalidProtoDefinitionException', () => {
        expect(
          () =>
            new ClientGrpcProxy({
              protoPath: '/nonexistent/invalid.proto',
              package: 'test',
            }),
        ).toThrow(InvalidProtoDefinitionException);
      });
    });
  });
  describe('close', () => {
    it('should call "close" method', () => {
      const grpcClient = { close: vi.fn() };
      untypedClient.clients.set('test', grpcClient);
      untypedClient.grpcClients[0] = {};

      client.close();
      expect(grpcClient.close).toHaveBeenCalled();
      expect(untypedClient.clients.size).toBe(0);
      expect(untypedClient.grpcClients.length).toBe(0);
    });
  });

  describe('publish', () => {
    it('should throw exception', () => {
      expect(() => client['publish'](null, null!)).toThrow(Error);
    });
  });

  describe('send', () => {
    it('should throw exception', () => {
      expect(() => client.send(null, null)).toThrow(Error);
    });
  });

  describe('connect', () => {
    it('should throw exception', () => {
      client.connect().catch(error => expect(error).toBeInstanceOf(Error));
    });
  });

  describe('dispatchEvent', () => {
    it('should throw exception', () => {
      client['dispatchEvent'](null).catch(error =>
        expect(error).toBeInstanceOf(Error),
      );
    });
  });

  describe('lookupPackage', () => {
    it('should return root package in case package name is not defined', () => {
      const root = {};

      expect(client.lookupPackage(root, undefined!)).toBe(root);
      expect(client.lookupPackage(root, '')).toBe(root);
    });
  });
});
