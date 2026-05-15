import { Logger } from '@nestjs/common';
import { join } from 'path';
import { ReplaySubject, Subject, throwError } from 'rxjs';
import { InvalidGrpcPackageException } from '../../errors/invalid-grpc-package.exception.js';
import { InvalidProtoDefinitionException } from '../../errors/invalid-proto-definition.exception.js';
import { GrpcMethodStreamingType } from '../../index.js';
import { ServerGrpc } from '../../server/index.js';
import { objectToMap } from './utils/object-to-map.js';

const CANCELLED_EVENT = 'cancelled';

class NoopLogger extends Logger {
  log(message: any, context?: string): void {}
  error(message: any, trace?: string, context?: string): void {}
  warn(message: any, context?: string): void {}
}

describe('ServerGrpc', () => {
  let server: ServerGrpc;
  let untypedServer: any;
  let serverMulti: ServerGrpc;

  beforeEach(() => {
    server = new ServerGrpc({
      protoPath: join(import.meta.dirname, './test.proto'),
      package: 'test',
    });
    untypedServer = server as any;

    serverMulti = new ServerGrpc({
      protoPath: ['test.proto', 'test2.proto'],
      package: ['test', 'test2'],
      loader: {
        includeDirs: [join(import.meta.dirname, '.')],
      },
    });
  });

  describe('listen', () => {
    let callback: ReturnType<typeof vi.fn>;
    let bindEventsStub: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      callback = vi.fn();
      bindEventsStub = vi
        .spyOn(server, 'bindEvents')
        .mockImplementation(() => ({}) as any);
    });

    it('should call "bindEvents"', async () => {
      await server.listen(callback);
      await server.close();
      expect(bindEventsStub).toHaveBeenCalled();
    });
    it('should call callback', async () => {
      await server.listen(callback);
      await server.close();
      expect(callback).toHaveBeenCalled();
    });
    describe('when "start" throws an exception', () => {
      it('should call callback with a thrown error as an argument', async () => {
        const error = new Error('random error');

        const callbackSpy = vi.fn();
        vi.spyOn(server, 'createClient').mockImplementation(async () => null);

        vi.spyOn(server, 'start').mockImplementation(() => {
          throw error;
        });
        await server.listen(callbackSpy);
        expect(callbackSpy).toHaveBeenCalledWith(error);
      });
    });
  });

  describe('listen (multiple proto)', () => {
    let callback: ReturnType<typeof vi.fn>;
    let bindEventsStub: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      callback = vi.fn();
      bindEventsStub = vi
        .spyOn(serverMulti, 'bindEvents')
        .mockImplementation(() => ({}) as any);
    });

    it('should call "bindEvents"', async () => {
      await serverMulti.listen(callback);
      await serverMulti.close();
      expect(bindEventsStub).toHaveBeenCalled();
    });
    it('should call callback', async () => {
      await serverMulti.listen(callback);
      await serverMulti.close();
      expect(callback).toHaveBeenCalled();
    });
  });

  describe('bindEvents', () => {
    beforeEach(() => {
      vi.spyOn(server, 'loadProto').mockImplementation(() => ({}));
    });
    describe('when package does not exist', () => {
      it('should throw "InvalidGrpcPackageException"', async () => {
        vi.spyOn(server, 'lookupPackage').mockImplementation(() => null);
        untypedServer.logger = new NoopLogger();
        await expect(server.bindEvents()).rejects.toBeInstanceOf(
          InvalidGrpcPackageException,
        );
      });
    });
    describe('when package exist', () => {
      it('should call "addService"', async () => {
        const serviceNames = [
          {
            name: 'test',
            service: true,
          },
          {
            name: 'test2',
            service: true,
          },
        ];
        vi.spyOn(server, 'lookupPackage').mockImplementation(() => ({
          test: { service: true },
          test2: { service: true },
        }));
        vi.spyOn(server, 'getServiceNames').mockImplementation(
          () => serviceNames,
        );
        untypedServer.grpcClient = { addService: vi.fn() };

        await server.bindEvents();
        expect(untypedServer.grpcClient.addService).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('bindEvents (multiple proto)', () => {
    beforeEach(() => {
      vi.spyOn(serverMulti, 'loadProto').mockImplementation(() => ({}));
    });
    describe('when package does not exist', () => {
      it('should throw "InvalidGrpcPackageException"', async () => {
        vi.spyOn(serverMulti, 'lookupPackage').mockImplementation(() => null);
        (serverMulti as any).logger = new NoopLogger();
        await expect(serverMulti.bindEvents()).rejects.toBeInstanceOf(
          InvalidGrpcPackageException,
        );
      });
    });
    describe('when package exist', () => {
      it('should call "addService"', async () => {
        const serviceNames = [
          {
            name: 'test',
            service: true,
          },
        ];
        vi.spyOn(serverMulti, 'lookupPackage').mockImplementation(() => ({
          test: { service: true },
        }));
        vi.spyOn(serverMulti, 'getServiceNames').mockImplementation(
          () => serviceNames,
        );

        (serverMulti as any).grpcClient = { addService: vi.fn() };

        await serverMulti.bindEvents();
        expect(
          (serverMulti as any).grpcClient.addService,
        ).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('getServiceNames', () => {
    it('should return filtered object keys', () => {
      const obj = {
        key: { service: true },
        key2: { service: true },
        key3: { service: false },
      };
      const expected = [
        {
          name: 'key',
          service: { service: true },
        },
        {
          name: 'key2',
          service: { service: true },
        },
      ];
      expect(server.getServiceNames(obj)).toEqual(expected);
    });
  });

  describe('createService', () => {
    it('should call "createServiceMethod"', async () => {
      const handlers = objectToMap({
        test: null,
        test2: () => ({}),
      });
      vi.spyOn(server, 'createPattern')
        .mockReturnValueOnce('test')
        .mockReturnValueOnce('test2');

      const spy = vi
        .spyOn(server, 'createServiceMethod')
        .mockImplementation(() => ({}) as any);
      untypedServer.messageHandlers = handlers;
      await server.createService(
        {
          prototype: { test: true, test2: true },
        },
        'name',
      );
      expect(spy).toHaveBeenCalledOnce();
    });
    describe('when RX streaming', () => {
      it('should call "createPattern" with proper arguments', async () => {
        const handlers = objectToMap({
          test2: {
            requestStream: true,
          },
        });
        const createPatternStub = vi
          .spyOn(server, 'createPattern')
          .mockReturnValueOnce('test2');

        vi.spyOn(server, 'createServiceMethod').mockImplementation(
          () => ({}) as any,
        );
        untypedServer.messageHandlers = handlers;
        await server.createService(
          {
            prototype: {
              test2: {
                requestStream: true,
              },
            },
          },
          'name',
        );
        expect(createPatternStub).toHaveBeenCalledWith(
          'name',
          'test2',
          GrpcMethodStreamingType.RX_STREAMING,
        );
      });
    });
    describe('when pass through streaming', () => {
      it('should call "createPattern" with proper arguments', async () => {
        const handlers = objectToMap({
          test2: {
            requestStream: true,
          },
        });
        const createPatternStub = vi
          .spyOn(server, 'createPattern')
          .mockReturnValueOnce('_invalid')
          .mockReturnValueOnce('_invalid')
          .mockReturnValueOnce('test2');

        vi.spyOn(server, 'createServiceMethod').mockImplementation(
          () => ({}) as any,
        );
        untypedServer.messageHandlers = handlers;
        await server.createService(
          {
            prototype: {
              test2: {
                requestStream: true,
              },
            },
          },
          'name',
        );
        expect(createPatternStub).toHaveBeenCalledWith(
          'name',
          'test2',
          GrpcMethodStreamingType.PT_STREAMING,
        );
      });
    });
  });

  describe('getMessageHandler', () => {
    it('should return handler when service name specified', () => {
      const testPattern = server.createPattern(
        'test',
        'TestMethod',
        GrpcMethodStreamingType.NO_STREAMING,
      );
      const handlers = new Map([[testPattern, () => ({})]]);
      untypedServer.messageHandlers = handlers;

      expect(
        server.getMessageHandler(
          'test',
          'TestMethod',
          GrpcMethodStreamingType.NO_STREAMING,
          {},
        ),
      ).not.toBeUndefined();
    });
    it('should return handler when package name specified with service name', () => {
      const testPattern = server.createPattern(
        'package.example.test',
        'TestMethod',
        GrpcMethodStreamingType.NO_STREAMING,
      );
      const handlers = new Map([[testPattern, () => ({})]]);
      untypedServer.messageHandlers = handlers;

      expect(
        server.getMessageHandler(
          'test',
          'TestMethod',
          GrpcMethodStreamingType.NO_STREAMING,
          {
            path: '/package.example.test/TestMethod',
          },
        ),
      ).not.toBeUndefined();
    });

    it('should return undefined when method name is unknown', () => {
      const testPattern = server.createPattern(
        'package.example.test',
        'unknown',
        GrpcMethodStreamingType.NO_STREAMING,
      );
      const handlers = new Map([[testPattern, () => ({})]]);
      untypedServer.messageHandlers = handlers;

      expect(
        server.getMessageHandler(
          'test',
          'TestMethod',
          GrpcMethodStreamingType.NO_STREAMING,
          {
            path: '/package.example.test/TestMethod',
          },
        ),
      ).toBeUndefined();
    });
  });

  describe('createPattern', () => {
    it('should return pattern', () => {
      const service = 'test';
      const method = 'method';
      expect(
        server.createPattern(
          service,
          method,
          GrpcMethodStreamingType.NO_STREAMING,
        ),
      ).toEqual(
        JSON.stringify({
          service,
          rpc: method,
          streaming: GrpcMethodStreamingType.NO_STREAMING,
        }),
      );
    });
  });

  describe('createServiceMethod', () => {
    describe('when method is a response stream', () => {
      it('should call "createStreamServiceMethod"', () => {
        const cln = vi.fn();
        const spy = vi.spyOn(server, 'createStreamServiceMethod');
        server.createServiceMethod(
          cln,
          { responseStream: true } as any,
          GrpcMethodStreamingType.NO_STREAMING,
        );

        expect(spy).toHaveBeenCalled();
      });
    });
    describe('when method is not a response stream', () => {
      it('should call "createUnaryServiceMethod"', () => {
        const cln = vi.fn();
        const spy = vi.spyOn(server, 'createUnaryServiceMethod');
        server.createServiceMethod(
          cln,
          { responseStream: false } as any,
          GrpcMethodStreamingType.NO_STREAMING,
        );

        expect(spy).toHaveBeenCalled();
      });
    });
    describe('when request is a stream', () => {
      describe('when stream type is RX_STREAMING', () => {
        it('should call "createRequestStreamMethod"', () => {
          const cln = vi.fn();
          const spy = vi.spyOn(server, 'createRequestStreamMethod');
          server.createServiceMethod(
            cln,
            { requestStream: true } as any,
            GrpcMethodStreamingType.RX_STREAMING,
          );

          expect(spy).toHaveBeenCalled();
        });
      });
      describe('when stream type is PT_STREAMING', () => {
        it('should call "createStreamCallMethod"', () => {
          const cln = vi.fn();
          const spy = vi.spyOn(server, 'createStreamCallMethod');
          server.createServiceMethod(
            cln,
            { requestStream: true } as any,
            GrpcMethodStreamingType.PT_STREAMING,
          );

          expect(spy).toHaveBeenCalled();
        });
      });
    });
  });

  describe('createStreamServiceMethod', () => {
    it('should return function', () => {
      const fn = server.createStreamServiceMethod(vi.fn());
      expect(fn).toBeTypeOf('function');
    });

    describe('on call', () => {
      it('should call native method', async () => {
        const call = {
          write: vi.fn(() => true),
          end: vi.fn(),
          on: vi.fn(),
          off: vi.fn(),
        };
        const callback = vi.fn();
        const native = vi.fn();

        await server.createStreamServiceMethod(native)(call, callback);
        expect(native).toHaveBeenCalled();
        expect(call.on).toHaveBeenCalledWith('cancelled', expect.any(Function));
        expect(call.off).toHaveBeenCalledWith(
          'cancelled',
          expect.any(Function),
        );
      });

      it('should handle error thrown in handler', async () => {
        const call = {
          write: vi.fn(() => true),
          end: vi.fn(),
          on: vi.fn(),
          off: vi.fn(),
          emit: vi.fn(),
        };

        const callback = vi.fn();
        const error = new Error('handler threw');
        const native = vi.fn(() => throwError(() => error));

        // implicit assertion that this will never throw when call.emit emits an error event
        await server.createStreamServiceMethod(native)(call, callback);
        expect(native).toHaveBeenCalled();
        expect(call.emit).toHaveBeenCalledWith('error', error);
        expect(call.end).toHaveBeenCalled();
      });

      it(`should close the result observable when receiving an 'cancelled' event from the client`, async () => {
        const et = new EventTarget();
        const cancel = () => et.dispatchEvent(new Event('cancelled'));

        const written: any[] = [];
        const call = {
          write: vi.fn((value: any) => {
            written.push(value);
            return true;
          }),
          end: vi.fn(() => written.push('end')),
          on: vi.fn((name, cb) => {
            et.addEventListener(name, cb);
          }),
          off: vi.fn((name, cb) => {
            et.removeEventListener(name, cb);
          }),
        };

        const result$ = new Subject<number>();
        const resolvedObservable = Promise.resolve(result$);
        const callback = vi.fn();
        const native = vi.fn().mockReturnValue(resolvedObservable);

        const result = server.createStreamServiceMethod(native)(call, callback);

        await resolvedObservable;

        result$.next(1);
        expect(written).toEqual([1]);
        result$.next(2);
        expect(written).toEqual([1, 2]);
        result$.next(3);
        expect(written).toEqual([1, 2, 3]);
        cancel();
        result$.next(4);
        expect(written).toEqual([1, 2, 3, 'end']);

        expect(call.end).toHaveBeenCalled();
        expect(call.on).toHaveBeenCalledWith('cancelled', expect.any(Function));
        expect(call.on).toHaveBeenCalledWith('drain', expect.any(Function));
        expect(call.off).toHaveBeenCalledWith(
          'cancelled',
          expect.any(Function),
        );
        expect(call.off).toHaveBeenCalledWith('drain', expect.any(Function));

        await result;
      });
    });
  });

  describe('createUnaryServiceMethod', () => {
    it('should return observable', () => {
      const fn = server.createUnaryServiceMethod(vi.fn());
      expect(fn).toBeTypeOf('function');
    });
    describe('on call', () => {
      it('should call native & callback methods', async () => {
        const call = { write: vi.fn(), end: vi.fn() };
        const callback = vi.fn();
        const native = vi.fn();

        await server.createUnaryServiceMethod(native)(call, callback);
        expect(native).toHaveBeenCalled();
        expect(callback).toHaveBeenCalled();
      });

      it('should await when a promise is return by the native', async () => {
        const call = { write: vi.fn(), end: vi.fn() };
        const callback = vi.fn();

        const native = vi.fn().mockReturnValue(
          (() => {
            const sub = new ReplaySubject<any>(1);
            sub.next(new Promise(resolve => resolve({ foo: 'bar' })));
            return sub.asObservable();
          })(),
        );

        await server.createUnaryServiceMethod(native)(call, callback);
        expect(native).toHaveBeenCalledOnce();
        expect(callback).toHaveBeenCalledWith(null, { foo: 'bar' });
      });
    });
  });

  describe('createRequestStreamMethod', () => {
    it('should wrap call into Subject', async () => {
      const handler = vi.fn();
      const fn = server.createRequestStreamMethod(handler, false);
      const call = {
        on: (event, callback) => callback(),
        off: vi.fn(),
        end: vi.fn(),
        write: vi.fn(),
      };
      await fn(call as any, vi.fn());

      expect(handler).toHaveBeenCalled();
    });

    it('should wrap call into Subject with metadata', async () => {
      const handler = vi.fn();
      const fn = server.createRequestStreamMethod(handler, false);
      const call = {
        on: (event, callback) => callback(),
        off: vi.fn(),
        end: vi.fn(),
        write: vi.fn(),
        metadata: {
          test: '123',
        },
      };
      await fn(call as any, vi.fn());

      expect(handler).toHaveBeenCalled();
      expect(handler.mock.calls[0][1]).toBe(call.metadata);
    });

    describe('when response is not a stream', () => {
      it('should call callback', async () => {
        const handler = async () => ({ test: true });
        const fn = server.createRequestStreamMethod(handler, false);
        const call = {
          on: (event, callback) => {
            if (event !== CANCELLED_EVENT) {
              callback();
            }
          },
          off: vi.fn(),
          end: vi.fn(),
          write: vi.fn(() => false),
        };

        const responseCallback = vi.fn();
        await fn(call as any, responseCallback);

        expect(responseCallback).toHaveBeenCalled();
      });

      it('should handle error thrown in handler', async () => {
        const error = new Error('Error');
        const handler = async () => throwError(() => error);
        const fn = server.createRequestStreamMethod(handler, false);
        const call = {
          on: (event, callback) => {
            if (event !== CANCELLED_EVENT) {
              callback();
            }
          },
          off: vi.fn(),
          end: vi.fn(),
          write: vi.fn(),
        };

        const responseCallback = vi.fn();
        await fn(call as any, responseCallback);

        expect(responseCallback).toHaveBeenCalledOnce();
        expect(responseCallback.mock.calls[0]).toEqual([error, null]);
      });

      describe('when response is a stream', () => {
        /**
         * A helper to create a repeated fixture to test streaming writes against.
         */
        async function createCall() {
          const emitter = new EventTarget();

          // If we write more than this number, the call will become unwritable.
          const highwaterMark = 2;
          let writeCounter = 0;

          // What has been "written" so far.
          const written: any[] = [];

          const drain = () => {
            writeCounter = 0;
            emitter.dispatchEvent(new Event('drain'));
          };

          const cancel = () => {
            emitter.dispatchEvent(new Event(CANCELLED_EVENT));
          };

          const call = {
            write: vi.fn(value => {
              // Simulating a writable stream becoming overwhelmed.
              if (writeCounter++ < highwaterMark) {
                // We can write this value to the stream.
                written.push(value);
              }
              // But as soon as we pass the highwater mark, we can't write anymore.
              return writeCounter < highwaterMark;
            }),
            end: vi.fn(() => {
              written.push('end');
            }),
            emit: vi.fn(),
            request: vi.fn(),
            metadata: vi.fn(),
            sendMetadata: vi.fn(),
            on: (name, cb) => {
              emitter.addEventListener(name, cb);
            },
            off: (name, cb) => {
              emitter.removeEventListener(name, cb);
            },
            fire: {
              drain,
              cancel,
            },
          };

          const callback = vi.fn();

          const subject = new Subject<string>();
          const handlerResult = Promise.resolve(subject);
          const methodHandler = () => handlerResult;

          const serviceMethod = server.createRequestStreamMethod(
            methodHandler,
            true,
          );

          const result = serviceMethod(call, callback);

          await handlerResult;

          return { call, written, result, subject };
        }

        it('should call write() and end() for streams from promises', async () => {
          const handler = async () => ({ test: true });
          const fn = server.createRequestStreamMethod(handler, true);
          const call = {
            on: (event, callback) => {
              if (event !== CANCELLED_EVENT) {
                callback();
              }
            },
            off: vi.fn(),
            end: vi.fn(),
            write: vi.fn(() => true),
          };

          await fn(call as any, null!);

          expect(call.write).toHaveBeenCalled();
          expect(call.end).toHaveBeenCalled();
        });

        it('should drain all values emitted from the observable while waiting for the drain event from the call', async () => {
          const { call, written, result, subject } = await createCall();

          subject.next('a');
          subject.next('b');
          expect(written).toEqual(['a', 'b']);
          subject.next('c'); // can't be written yet.
          expect(written).toEqual(['a', 'b']);
          call.fire.drain();
          subject.next('d');
          expect(written).toEqual(['a', 'b', 'c', 'd']);
          subject.next('e'); // can't be written yet.
          expect(written).toEqual(['a', 'b', 'c', 'd']);
          call.fire.drain();
          expect(written).toEqual(['a', 'b', 'c', 'd', 'e']);
          subject.next('f');
          expect(written).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
          subject.complete();
          expect(written).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'end']);

          return result;
        });

        it(
          'should drain all values emitted from the observable while waiting for the drain event from the call ' +
            'even if the call becomes unwritable during draining',
          async () => {
            const { call, written, result, subject } = await createCall();

            subject.next('a');
            subject.next('b');
            subject.next('c');
            subject.next('d');
            subject.next('e');
            expect(written).toEqual(['a', 'b']);
            call.fire.drain();
            expect(written).toEqual(['a', 'b', 'c', 'd']);
            call.fire.drain();
            expect(written).toEqual(['a', 'b', 'c', 'd', 'e']);
            subject.complete();
            expect(written).toEqual(['a', 'b', 'c', 'd', 'e', 'end']);

            return result;
          },
        );

        it('should wait to end until after the internal buffer has drained', async () => {
          const { call, written, result, subject } = await createCall();

          subject.next('a');
          subject.next('b');
          subject.next('c');
          subject.next('d');
          subject.next('e');
          subject.complete();
          expect(written).toEqual(['a', 'b']);
          call.fire.drain();
          expect(written).toEqual(['a', 'b', 'c', 'd']);
          call.fire.drain();
          expect(written).toEqual(['a', 'b', 'c', 'd', 'e', 'end']);

          return result;
        });

        it('should end the subscription to the source if the call is cancelled', async () => {
          const { call, subject, result } = await createCall();

          expect(subject.observed).toBe(true);
          call.fire.cancel();
          expect(subject.observed).toBe(false);
          expect(call.end).toHaveBeenCalled();

          return result;
        });

        it('should wait to throw errors from the observable source until after the internal buffer has drained', async () => {
          const { call, written, result, subject } = await createCall();
          const error = new Error('test');
          subject.next('a');
          subject.next('b');
          subject.next('c');
          subject.next('d');
          subject.next('e');
          subject.error(error);
          expect(written).toEqual(['a', 'b']);
          call.fire.drain();
          expect(written).toEqual(['a', 'b', 'c', 'd']);
          call.fire.drain();
          expect(written).toEqual(['a', 'b', 'c', 'd', 'e', 'end']);

          try {
            await result;
          } catch (err) {
            expect(err).toBe(error);
          }
        });
      });
    });
  });

  describe('createStreamCallMethod', () => {
    it('should pass through to "methodHandler"', async () => {
      const handler = vi.fn();
      const fn = server.createStreamCallMethod(handler, false);
      const args = [1, 2, 3];
      await fn(args as any, vi.fn());

      expect(handler).toHaveBeenCalledWith(args, expect.any(Function));
    });
  });

  describe('loadProto', () => {
    describe('when proto is invalid', () => {
      it('should throw InvalidProtoDefinitionException', () => {
        const invalidServer = new ServerGrpc({
          protoPath: '/nonexistent/invalid.proto',
          package: 'test',
        });
        (invalidServer as any).logger = new NoopLogger();
        expect(() => invalidServer.loadProto()).toThrow(
          InvalidProtoDefinitionException,
        );
      });
    });
  });

  describe('close', () => {
    it('should call "forceShutdown" by default', async () => {
      const grpcClient = {
        forceShutdown: vi.fn(),
        tryShutdown: vi.fn(cb => cb()),
      };
      untypedServer.grpcClient = grpcClient;
      await server.close();
      expect(grpcClient.forceShutdown).toHaveBeenCalled();
      expect(grpcClient.tryShutdown).not.toHaveBeenCalled();
    });

    it('should call "forceShutdown" when "gracefulShutdown" is false', async () => {
      const grpcClient = {
        forceShutdown: vi.fn(),
        tryShutdown: vi.fn(cb => cb()),
      };
      untypedServer.grpcClient = grpcClient;
      untypedServer.options.gracefulShutdown = false;
      await server.close();
      expect(grpcClient.forceShutdown).toHaveBeenCalled();
      expect(grpcClient.tryShutdown).not.toHaveBeenCalled();
    });

    it('should call "tryShutdown" when "gracefulShutdown" is true', async () => {
      const grpcClient = {
        forceShutdown: vi.fn(),
        tryShutdown: vi.fn(cb => cb()),
      };
      untypedServer.grpcClient = grpcClient;
      untypedServer.options.gracefulShutdown = true;
      await server.close();
      expect(grpcClient.forceShutdown).not.toHaveBeenCalled();
      expect(grpcClient.tryShutdown).toHaveBeenCalled();
    });
  });

  describe('deserialize', () => {
    it(`should return parsed json`, () => {
      const obj = { test: 'test' };
      expect(server.deserialize(obj)).toEqual(JSON.parse(JSON.stringify(obj)));
    });
    it(`should not parse argument if it is not an object`, () => {
      const content = 'test';
      expect(server.deserialize(content)).toBe(content);
    });
  });

  describe('proto interfaces parser should account for package namespaces', () => {
    it('should parse multi-level proto package tree"', () => {
      const grpcPkg = {
        A: {
          C: {
            E: {
              service: {
                serviceName: {},
              },
            },
          },
        },
        B: {
          D: {
            service: {
              serviceName: {},
            },
          },
        },
      };
      const svcs = server.getServiceNames(grpcPkg);
      expect(svcs.length).toBe(2);
      expect(svcs[0].name).toBe('A.C.E');
      expect(svcs[1].name).toBe('B.D');
    });
    it('should parse single level proto package tree"', () => {
      const grpcPkg = {
        A: {
          service: {
            serviceName: {},
          },
        },
        B: {
          service: {
            serviceName: {},
          },
        },
      };
      const services = server.getServiceNames(grpcPkg);
      expect(services.length).toBe(2);
      expect(services[0].name).toBe('A');
      expect(services[1].name).toBe('B');
    });
  });

  describe('addHandler', () => {
    const callback = () => {},
      pattern = { test: 'test pattern' };

    it(`should add handler`, () => {
      vi.spyOn(server as any, 'messageHandlers', 'get').mockReturnValue({
        set() {},
      });

      const messageHandlersSetSpy = vi.spyOn(
        untypedServer.messageHandlers,
        'set',
      );
      server.addHandler(pattern, callback as any);

      expect(messageHandlersSetSpy).toHaveBeenCalled();
      expect(messageHandlersSetSpy.mock.calls[0][0]).toBe(
        JSON.stringify(pattern),
      );
    });
  });
});
