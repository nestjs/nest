import { Logger } from '@nestjs/common';
import { join } from 'path';
import { EventEmitter } from 'events';
import { Duplex, Writable } from 'stream';
import {
  BehaviorSubject,
  concat,
  EMPTY,
  firstValueFrom,
  lastValueFrom,
  NEVER,
  of,
  ReplaySubject,
  Subject,
  toArray,
  throwError,
} from 'rxjs';
import { ignoreElements, map, tap } from 'rxjs/operators';
import { InvalidGrpcPackageException } from '../../errors/invalid-grpc-package.exception.js';
import { InvalidProtoDefinitionException } from '../../errors/invalid-proto-definition.exception.js';
import { GrpcMethodStreamingType, GrpcStatus } from '../../index.js';
import { ServerGrpc } from '../../server/index.js';
import { objectToMap } from './utils/object-to-map.js';

const CANCELLED_EVENT = 'cancelled';

const internalError = {
  code: GrpcStatus.INTERNAL,
  details: 'Internal server error',
};

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
        const call = {
          write: vi.fn(),
          end: vi.fn(),
          on: vi.fn(),
          off: vi.fn(),
        };
        const callback = vi.fn();
        const native = vi.fn();

        await server.createUnaryServiceMethod(native)(call, callback);
        expect(native).toHaveBeenCalled();
        expect(callback).toHaveBeenCalled();
      });

      it('should call the processing end hook when the handler errors', async () => {
        const call = {
          request: { data: [1, 2, 3] },
          write: vi.fn(),
          end: vi.fn(),
          on: vi.fn(),
          off: vi.fn(),
        };
        const callback = vi.fn();
        const error = new Error('handler threw');
        const native = vi.fn().mockReturnValue(throwError(() => error));
        let endHookArgs: unknown[] | undefined;

        (server as any).onProcessingEndHook = (...args: unknown[]) => {
          endHookArgs = args;
        };

        await server.createUnaryServiceMethod(native)(call as any, callback);

        expect(callback).toHaveBeenCalledWith(error);
        expect(endHookArgs).not.toBeUndefined();
        expect(endHookArgs![0]).toBe(server.transportId);
        expect(endHookArgs![1]).toEqual(call.request);
      });

      it('should fail the call when the handler completes without a response', async () => {
        const call = {
          write: vi.fn(),
          end: vi.fn(),
          on: vi.fn(),
          off: vi.fn(),
        };
        const callback = vi.fn();

        await server.createUnaryServiceMethod(() => EMPTY)(call, callback);

        expect(callback).toHaveBeenCalledExactlyOnceWith({
          code: GrpcStatus.INTERNAL,
          details: 'The handler completed without emitting a response',
        });
      });

      it('should await when a promise is return by the native', async () => {
        const call = {
          write: vi.fn(),
          end: vi.fn(),
          on: vi.fn(),
          off: vi.fn(),
        };
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

      it('should call callback when handler resolves to undefined', async () => {
        const handler = async () => undefined;
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

        expect(responseCallback).toHaveBeenCalledExactlyOnceWith(
          null,
          undefined,
        );
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

  describe('when the client of a bidirectional call does not read the responses', () => {
    // Like a grpc-js call: a response is written once the client reads it,
    // and the requests are read for as long as the call is flowing
    function createCall() {
      const pendingWrites: Array<() => void> = [];
      const call = Object.assign(
        new Duplex({
          objectMode: true,
          readableHighWaterMark: 1,
          writableHighWaterMark: 1,
          read() {},
          write(_chunk, _encoding, callback) {
            pendingWrites.push(callback);
          },
        }),
        { request: {}, metadata: {}, cancelled: false },
      );
      const readResponses = () =>
        pendingWrites.splice(0).forEach(write => write());
      return { call, readResponses };
    }

    const tick = () => new Promise(resolve => setImmediate(resolve));

    it('should stop reading requests until the client reads the responses', async () => {
      const { call, readResponses } = createCall();
      const handled: number[] = [];
      const echo = (requests: any) => {
        requests.drainBuffer?.();
        return requests.pipe(tap((request: number) => handled.push(request)));
      };

      const result = server.createRequestStreamMethod(echo, true)(
        call as any,
        vi.fn(),
      );
      await tick();
      for (let request = 0; request < 5; request++) {
        call.push(request);
      }
      await tick();

      expect(handled).toEqual([0]);
      expect(call.isPaused()).toBe(true);

      readResponses();
      await tick();
      expect(handled).toEqual([0, 1]);

      while (handled.length < 5) {
        readResponses();
        await tick();
      }
      call.push(null);
      await tick();
      readResponses();
      await result;

      expect(handled).toEqual([0, 1, 2, 3, 4]);
    });
  });

  describe('bufferUntilDrained', () => {
    const tick = () => new Promise(resolve => setImmediate(resolve));

    it('should preserve message order while replay is pending', async () => {
      const buffer = untypedServer.bufferUntilDrained();
      buffer.next('first');
      const stream = buffer.subject.asObservable();
      stream.drainBuffer();
      const result = lastValueFrom(stream.pipe(toArray()));

      buffer.next('second');
      await tick();
      buffer.next('third');
      buffer.complete();

      expect(await result).toEqual(['first', 'second', 'third']);
    });

    it('should retain messages received before subscribing to the pending replay', async () => {
      const buffer = untypedServer.bufferUntilDrained();
      buffer.next('first');
      const stream = buffer.subject.asObservable();
      stream.drainBuffer();
      buffer.next('second');
      buffer.complete();

      expect(await lastValueFrom(stream.pipe(toArray()))).toEqual([
        'first',
        'second',
      ]);
    });

    it('should deliver messages to consumers before replay is requested', async () => {
      const buffer = untypedServer.bufferUntilDrained();
      const stream = buffer.subject.asObservable();
      const result = firstValueFrom(stream);

      buffer.next('first');

      expect(await result).toBe('first');
      stream.drainBuffer();
      buffer.complete();
      await tick();
    });
  });

  describe('createRequestStreamMethod processing end hook', () => {
    function createCall() {
      return Object.assign(new EventEmitter(), {
        request: { data: [] },
        metadata: {},
        cancelled: false,
        write: vi.fn(() => true),
        end: vi.fn(),
      });
    }

    // What grpc-js emits on the server call: a client cancellation arrives as
    // "end", "cancelled" and "close"; an expired deadline as "cancelled" and
    // "close". Neither produces an "error" event.
    function cancelCall(
      call: ReturnType<typeof createCall>,
      { halfClosed = true } = {},
    ) {
      if (halfClosed) {
        call.emit('end');
      }
      call.cancelled = true;
      call.emit('cancelled', 'cancelled');
      call.emit('close');
    }

    function bindEndHook() {
      const endHook = vi.fn();
      untypedServer.onProcessingEndHook = endHook;
      return endHook;
    }

    const tick = () => new Promise(resolve => setImmediate(resolve));

    // The shape `@GrpcStreamMethod` produces: the handler consumes the request
    // stream and the buffer is drained once it runs.
    const consumingHandler = (stream: any) => {
      stream.drainBuffer?.();
      return lastValueFrom(stream.pipe(toArray()));
    };

    // The same handler behind an async guard or interceptor: it only drains
    // the buffer once the client may already be done.
    const delayedConsumingHandler = async (stream: any) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      return consumingHandler(stream);
    };

    it('should run the end hook once the handler finishes, after the call has ended', async () => {
      const endHook = bindEndHook();
      const call = createCall();
      const callback = vi.fn();

      const result = server.createRequestStreamMethod(consumingHandler, false)(
        call as any,
        callback,
      );
      await tick();
      call.emit('data', 'x');
      call.emit('end');
      await result;

      expect(callback).toHaveBeenCalledWith(null, ['x']);
      expect(endHook).toHaveBeenCalledExactlyOnceWith(
        server.transportId,
        call.request,
      );
    });

    it('should deliver the buffered messages when the call ends before the handler drains', async () => {
      const endHook = bindEndHook();
      const call = createCall();
      const callback = vi.fn();

      const result = server.createRequestStreamMethod(
        delayedConsumingHandler,
        false,
      )(call as any, callback);
      call.emit('data', 'a');
      call.emit('data', 'b');
      call.emit('end');
      await result;

      expect(callback).toHaveBeenCalledWith(null, ['a', 'b']);
      expect(endHook).toHaveBeenCalledExactlyOnceWith(
        server.transportId,
        call.request,
      );
    });

    it('should settle a consuming handler and run the end hook when the client cancels', async () => {
      const endHook = bindEndHook();
      const call = createCall();

      const result = server.createRequestStreamMethod(consumingHandler, false)(
        call as any,
        vi.fn(),
      );
      await tick();
      call.emit('data', 'x');
      cancelCall(call);
      await result;

      expect(endHook).toHaveBeenCalledExactlyOnceWith(
        server.transportId,
        call.request,
      );
    });

    it('should settle a consuming handler and run the end hook when the deadline expires', async () => {
      const endHook = bindEndHook();
      const call = createCall();

      const result = server.createRequestStreamMethod(consumingHandler, false)(
        call as any,
        vi.fn(),
      );
      await tick();
      call.emit('data', 'x');
      cancelCall(call, { halfClosed: false });
      await result;

      expect(endHook).toHaveBeenCalledExactlyOnceWith(
        server.transportId,
        call.request,
      );
    });

    it('should settle a consuming handler when the deadline expires before it drains', async () => {
      const endHook = bindEndHook();
      const call = createCall();

      const result = server.createRequestStreamMethod(
        delayedConsumingHandler,
        false,
      )(call as any, vi.fn());
      call.emit('data', 'x');
      cancelCall(call, { halfClosed: false });
      await result;

      expect(endHook).toHaveBeenCalledExactlyOnceWith(
        server.transportId,
        call.request,
      );
    });

    it('should fail the call when the handler completes without a response', async () => {
      const endHook = bindEndHook();
      const call = createCall();
      const callback = vi.fn();

      const result = server.createRequestStreamMethod((stream: any) => {
        stream.drainBuffer?.();
        return stream.pipe(ignoreElements());
      }, false)(call as any, callback);
      await tick();
      call.emit('data', 'x');
      call.emit('end');
      await result;

      expect(callback).toHaveBeenCalledExactlyOnceWith(
        {
          code: GrpcStatus.INTERNAL,
          details: 'The handler completed without emitting a response',
        },
        null,
      );
      expect(endHook).toHaveBeenCalledExactlyOnceWith(
        server.transportId,
        call.request,
      );
    });

    it('should not error the request stream when the handler errors the response stream', async () => {
      const call = createCall();
      const responseError = new Error('response failed');
      const requestErrors: unknown[] = [];
      const serverErrors: unknown[] = [];
      call.on('error', e => serverErrors.push(e));

      const handler = (stream: any) => {
        stream.subscribe({ error: (e: unknown) => requestErrors.push(e) });
        stream.drainBuffer?.();
        return throwError(() => responseError);
      };

      await server.createRequestStreamMethod(handler, true)(
        call as any,
        vi.fn(),
      );

      // The error still reaches the call, which sends it to the client
      expect(serverErrors).toEqual([responseError]);
      expect(requestErrors).toEqual([]);
    });

    it('should not error the request stream when the response errors after draining', async () => {
      const call = createCall();
      // Backpressure: the first write asks the server to wait for "drain"
      call.write.mockReturnValueOnce(false);
      const responseError = new Error('response failed');
      const requestErrors: unknown[] = [];
      const serverErrors: unknown[] = [];
      call.on('error', e => serverErrors.push(e));

      const handler = (stream: any) => {
        stream.subscribe({ error: (e: unknown) => requestErrors.push(e) });
        stream.drainBuffer?.();
        return concat(
          of('a', 'b'),
          throwError(() => responseError),
        );
      };

      const result = server.createRequestStreamMethod(handler, true)(
        call as any,
        vi.fn(),
      );
      await tick();
      // The error waits for the buffered value to be written
      expect(serverErrors).toEqual([]);
      call.emit('drain');
      await result;

      expect(call.write.mock.calls).toEqual([['a'], ['b']]);
      expect(serverErrors).toEqual([responseError]);
      expect(requestErrors).toEqual([]);
    });

    it('should still pass a transport error on to the request stream', async () => {
      const call = createCall();
      const transportError = new Error('transport failed');
      const requestErrors: unknown[] = [];

      const handler = (stream: any) => {
        stream.subscribe({ error: (e: unknown) => requestErrors.push(e) });
        stream.drainBuffer?.();
        return NEVER;
      };

      const result = server.createRequestStreamMethod(handler, true)(
        call as any,
        vi.fn(),
      );
      await tick();
      call.emit('error', transportError);

      expect(requestErrors).toEqual([transportError]);
      call.emit('cancelled', 'cancelled');
      await result;
    });

    it('should run the end hook when the call errors', async () => {
      const endHook = bindEndHook();
      const call = createCall();

      const result = server.createRequestStreamMethod(
        async () => ({ test: true }),
        false,
      )(call as any, vi.fn());
      call.emit('error', new Error('boom'));
      await result;

      expect(endHook).toHaveBeenCalledExactlyOnceWith(
        server.transportId,
        call.request,
      );
    });

    it('should run the end hook once and fail the call when the call errors under a consuming handler', async () => {
      const endHook = bindEndHook();
      const call = createCall();
      const callback = vi.fn();
      untypedServer.logger = new NoopLogger();

      const result = server.createRequestStreamMethod(consumingHandler, false)(
        call as any,
        callback,
      );
      await tick();
      call.emit('error', new Error('boom'));

      await expect(result).resolves.toBeUndefined();
      expect(callback).toHaveBeenCalledExactlyOnceWith(internalError, null);
      expect(endHook).toHaveBeenCalledExactlyOnceWith(
        server.transportId,
        call.request,
      );
    });

    it('should run the end hook when the client cancels a stream response call', async () => {
      const endHook = bindEndHook();
      const subject = new Subject<string>();
      const call = createCall();

      const result = server.createRequestStreamMethod(
        () => Promise.resolve(subject),
        true,
      )(call as any, vi.fn());
      await tick();
      cancelCall(call);
      await result;

      expect(endHook).toHaveBeenCalledExactlyOnceWith(
        server.transportId,
        call.request,
      );
    });

    it('should run the end hook when a stream response starts after the client cancelled', async () => {
      const endHook = bindEndHook();
      const call = createCall();

      const result = server.createRequestStreamMethod(async (stream: any) => {
        await consumingHandler(stream);
        await new Promise(resolve => setTimeout(resolve, 10));
        return of('a', 'b', 'c');
      }, true)(call as any, vi.fn());
      await tick();
      cancelCall(call);
      await result;

      expect(call.write).not.toHaveBeenCalled();
      expect(endHook).toHaveBeenCalledExactlyOnceWith(
        server.transportId,
        call.request,
      );
    });

    it('should let an error thrown by the end hook surface', async () => {
      untypedServer.onProcessingEndHook = () => {
        throw new Error('hook failed');
      };
      const call = createCall();

      const result = server.createRequestStreamMethod(
        async () => ({ test: true }),
        false,
      )(call as any, vi.fn());
      call.emit('end');

      await expect(result).rejects.toThrow('hook failed');
    });
  });

  describe('processing hooks', () => {
    const error = new Error('handler rejected');

    function bindHooks() {
      const endHook = vi.fn();
      untypedServer.onProcessingStartHook = (
        _transportId: unknown,
        _ctx: unknown,
        fn: () => Promise<void>,
      ) => fn();
      untypedServer.onProcessingEndHook = endHook;
      return endHook;
    }

    const createCall = () => ({
      request: { data: [1, 2, 3] },
      metadata: {},
      write: vi.fn(() => true),
      end: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    });

    const spyOnLoggerError = () =>
      vi.spyOn(untypedServer.logger, 'error').mockImplementation(() => {});

    describe('createUnaryServiceMethod', () => {
      it('should run the end hook once, with the request, when the handler completes', async () => {
        const endHook = bindHooks();
        const call = createCall();
        const callback = vi.fn();

        await server.createUnaryServiceMethod(async () => 'response')(
          call as any,
          callback,
        );

        expect(callback).toHaveBeenCalledWith(null, 'response');
        expect(endHook).toHaveBeenCalledExactlyOnceWith(
          server.transportId,
          call.request,
        );
      });

      // A rejection that bypassed the exception filters (a filter that
      // throws) would otherwise go unhandled: grpc-js drops the promise
      it('should run the end hook once and fail the call when the handler rejects', async () => {
        const endHook = bindHooks();
        const call = createCall();
        const callback = vi.fn();
        const loggerErrorSpy = spyOnLoggerError();

        await expect(
          server.createUnaryServiceMethod(async () => {
            throw error;
          })(call as any, callback),
        ).resolves.toBeUndefined();

        expect(callback).toHaveBeenCalledExactlyOnceWith(internalError);
        expect(loggerErrorSpy).toHaveBeenCalledExactlyOnceWith(error);
        expect(endHook).toHaveBeenCalledExactlyOnceWith(
          server.transportId,
          call.request,
        );
      });

      it('should fail the call when a response promise rejects', async () => {
        bindHooks();
        const callback = vi.fn();
        const loggerErrorSpy = spyOnLoggerError();

        await server.createUnaryServiceMethod(() =>
          of('hero').pipe(
            map(async () => {
              throw error;
            }),
          ),
        )(createCall() as any, callback);
        await new Promise(resolve => setImmediate(resolve));

        expect(callback).toHaveBeenCalledExactlyOnceWith(internalError);
        expect(loggerErrorSpy).toHaveBeenCalledExactlyOnceWith(error);
      });
    });

    describe('createStreamServiceMethod', () => {
      it('should run the end hook once and fail the call when the handler rejects', async () => {
        const endHook = bindHooks();
        const call = createCall();
        spyOnLoggerError();

        await expect(
          server.createStreamServiceMethod(async () => {
            throw error;
          })(call as any, vi.fn()),
        ).resolves.toBeUndefined();

        expect(call.emit).toHaveBeenCalledExactlyOnceWith(
          'error',
          internalError,
        );
        expect(endHook).toHaveBeenCalledExactlyOnceWith(
          server.transportId,
          call.request,
        );
      });
    });

    describe('createRequestStreamMethod', () => {
      it('should run the end hook once and fail the call when the call ends and the handler then rejects', async () => {
        const endHook = bindHooks();
        const callback = vi.fn();
        const call = {
          ...createCall(),
          // Fires every listener as soon as it is registered, so the call has
          // already ended by the time the handler rejects.
          on: (event: string, listener: () => void) => {
            if (event !== CANCELLED_EVENT) {
              listener();
            }
          },
        };
        spyOnLoggerError();

        await expect(
          server.createRequestStreamMethod(async () => {
            throw error;
          }, false)(call as any, callback),
        ).resolves.toBeUndefined();

        expect(callback).toHaveBeenCalledExactlyOnceWith(internalError, null);
        expect(endHook).toHaveBeenCalledExactlyOnceWith(
          server.transportId,
          call.request,
        );
      });

      it('should fail the call when the response promise rejects', async () => {
        bindHooks();
        const callback = vi.fn();
        const loggerErrorSpy = spyOnLoggerError();

        await expect(
          server.createRequestStreamMethod(
            () =>
              of('hero').pipe(
                map(async () => {
                  throw error;
                }),
              ),
            false,
          )(createCall() as any, callback),
        ).resolves.toBeUndefined();

        expect(callback).toHaveBeenCalledExactlyOnceWith(internalError, null);
        expect(loggerErrorSpy).toHaveBeenCalledExactlyOnceWith(error);
      });

      it('should fail a stream response call when the handler rejects', async () => {
        bindHooks();
        const call = createCall();
        spyOnLoggerError();

        await expect(
          server.createRequestStreamMethod(async () => {
            throw error;
          }, true)(call as any, vi.fn()),
        ).resolves.toBeUndefined();

        expect(call.emit).toHaveBeenCalledExactlyOnceWith(
          'error',
          internalError,
        );
      });
    });

    describe('createStreamCallMethod', () => {
      it('should run the end hook and resolve when the handler stream completes empty', async () => {
        const endHook = bindHooks();
        const call = createCall();

        await expect(
          server.createStreamCallMethod(async () => EMPTY, true)(
            call as any,
            vi.fn(),
          ),
        ).resolves.toBeUndefined();

        expect(endHook).toHaveBeenCalledExactlyOnceWith(
          server.transportId,
          call.request,
        );
      });

      it('should run the end hook once and emit the error on the call when the handler rejects', async () => {
        const endHook = bindHooks();
        const call = createCall();

        await expect(
          server.createStreamCallMethod(async () => {
            throw error;
          }, true)(call as any, vi.fn()),
        ).resolves.toBeUndefined();

        expect(call.emit).toHaveBeenCalledExactlyOnceWith('error', error);
        expect(endHook).toHaveBeenCalledExactlyOnceWith(
          server.transportId,
          call.request,
        );
      });

      it('should pass the error to the callback when a request stream handler errors', async () => {
        const endHook = bindHooks();
        const call = createCall();
        const callback = vi.fn();

        await expect(
          server.createStreamCallMethod(
            async () => throwError(() => error),
            false,
          )(call as any, callback),
        ).resolves.toBeUndefined();

        expect(callback).toHaveBeenCalledExactlyOnceWith(error, null);
        expect(call.emit).not.toHaveBeenCalled();
        expect(endHook).toHaveBeenCalledExactlyOnceWith(
          server.transportId,
          call.request,
        );
      });
    });
  });

  describe('when a unary call is cancelled', () => {
    // grpc-js emits "cancelled" when the client cancels, when the deadline
    // expires, when the connection drops and once the call has been answered
    function createCall({ cancelled = false } = {}) {
      return Object.assign(new EventEmitter(), {
        request: { id: 1 },
        metadata: {},
        cancelled,
      });
    }

    function cancelCall(call: ReturnType<typeof createCall>) {
      call.cancelled = true;
      call.emit(CANCELLED_EVENT, 'cancelled');
    }

    function bindEndHook() {
      const endHook = vi.fn();
      untypedServer.onProcessingEndHook = endHook;
      return endHook;
    }

    it('should unsubscribe from a response stream that has not emitted', async () => {
      const endHook = bindEndHook();
      const call = createCall();
      const callback = vi.fn();
      const response$ = new Subject<string>();

      await server.createUnaryServiceMethod(() => response$)(call, callback);
      expect(response$.observed).toBe(true);
      cancelCall(call);

      expect(response$.observed).toBe(false);
      expect(callback).not.toHaveBeenCalled();
      expect(endHook).toHaveBeenCalledExactlyOnceWith(
        server.transportId,
        call.request,
      );
    });

    it('should unsubscribe from a response stream that stays open once the call is answered', async () => {
      const endHook = bindEndHook();
      const call = createCall();
      const callback = vi.fn();
      const response$ = new BehaviorSubject('hero');

      await server.createUnaryServiceMethod(() => response$)(call, callback);
      await new Promise(resolve => setImmediate(resolve));
      expect(callback).toHaveBeenCalledExactlyOnceWith(null, 'hero');
      cancelCall(call);

      expect(response$.observed).toBe(false);
      expect(endHook).toHaveBeenCalledOnce();
    });

    it('should not subscribe to the response stream if the call was cancelled while the handler ran', async () => {
      const endHook = bindEndHook();
      const call = createCall({ cancelled: true });
      const callback = vi.fn();
      const response$ = new Subject<string>();

      await server.createUnaryServiceMethod(() => response$)(call, callback);

      expect(response$.observed).toBe(false);
      expect(callback).not.toHaveBeenCalled();
      expect(endHook).toHaveBeenCalledExactlyOnceWith(
        server.transportId,
        call.request,
      );
    });
  });

  describe('when an error cannot be sent as it is', () => {
    // grpc-js throws on an error that is not an object ("'message' in
    // error") and on a status message with a lone surrogate ("encodeURI")
    const stringError = 'Forbidden resource';
    const sendableStringError = {
      code: GrpcStatus.UNKNOWN,
      message: 'Forbidden resource',
    };
    const loneSurrogateError = {
      code: GrpcStatus.INVALID_ARGUMENT,
      message: `Unexpected token '\ud83d', "😀" is not valid JSON`,
    };
    const sendableLoneSurrogateError = {
      code: GrpcStatus.INVALID_ARGUMENT,
      message: `Unexpected token '\ufffd', "😀" is not valid JSON`,
    };

    const createCall = () => ({
      request: {},
      metadata: {},
      write: vi.fn(() => true),
      end: vi.fn(),
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    });

    it.each([
      ['a string', stringError, sendableStringError],
      ['a lone surrogate', loneSurrogateError, sendableLoneSurrogateError],
    ])(
      'should send a unary call an error with %s that grpc-js can send',
      async (_, error, sendableError) => {
        const callback = vi.fn();

        await server.createUnaryServiceMethod(() => throwError(() => error))(
          createCall(),
          callback,
        );

        expect(callback).toHaveBeenCalledExactlyOnceWith(sendableError);
      },
    );

    it.each([
      ['a string', stringError, sendableStringError],
      ['a lone surrogate', loneSurrogateError, sendableLoneSurrogateError],
    ])(
      'should emit a response stream an error with %s that grpc-js can send',
      async (_, error, sendableError) => {
        const call = createCall();

        await server.createStreamServiceMethod(() => throwError(() => error))(
          call,
          vi.fn(),
        );

        expect(call.emit).toHaveBeenCalledExactlyOnceWith(
          'error',
          sendableError,
        );
      },
    );

    it('should send a client stream call an error that grpc-js can send', async () => {
      const callback = vi.fn();

      await server.createRequestStreamMethod(
        () => throwError(() => stringError),
        false,
      )(createCall() as any, callback);

      expect(callback).toHaveBeenCalledExactlyOnceWith(
        sendableStringError,
        null,
      );
    });

    it('should send a stream call an error that grpc-js can send', async () => {
      const callback = vi.fn();
      const call = createCall();
      const handler = async () => throwError(() => loneSurrogateError);

      await server.createStreamCallMethod(handler, false)(
        call as any,
        callback,
      );
      await server.createStreamCallMethod(handler, true)(call as any, callback);

      expect(callback).toHaveBeenCalledExactlyOnceWith(
        sendableLoneSurrogateError,
        null,
      );
      expect(call.emit).toHaveBeenCalledExactlyOnceWith(
        'error',
        sendableLoneSurrogateError,
      );
    });

    it('should send an error that grpc-js can send as it is', async () => {
      const callback = vi.fn();
      const error = new Error('well-formed 😀');

      await server.createUnaryServiceMethod(() => throwError(() => error))(
        createCall(),
        callback,
      );

      expect(callback.mock.calls[0][0]).toBe(error);
    });
  });

  describe('when a response stream emits null', () => {
    const nullResponseError = {
      code: GrpcStatus.INTERNAL,
      details: 'The handler emitted a null response',
    };

    // An object mode stream, like a grpc-js call: "write(null)" throws
    function createCall({ highWaterMark = 16 } = {}) {
      const written: unknown[] = [];
      const errors: unknown[] = [];
      const pendingWrites: Array<() => void> = [];
      const call = Object.assign(
        new Writable({
          objectMode: true,
          highWaterMark,
          write(chunk, _encoding, callback) {
            written.push(chunk);
            pendingWrites.push(callback);
          },
        }),
        { request: {}, metadata: {} },
      );
      call.on('error', err => errors.push(err));
      const flush = () => pendingWrites.splice(0).forEach(write => write());
      return { call, written, errors, flush };
    }

    it('should fail the call instead of writing null', async () => {
      const { call, written, errors } = createCall();

      await server.createStreamServiceMethod(() => of('a', null, 'b'))(
        call,
        vi.fn(),
      );

      expect(written).toEqual(['a']);
      expect(errors).toEqual([nullResponseError]);
    });

    it('should fail the call once the responses before null are written', async () => {
      const { call, written, errors, flush } = createCall({
        highWaterMark: 1,
      });
      const subject = new Subject<string | null>();

      const result = server.createStreamServiceMethod(() => subject)(
        call,
        vi.fn(),
      );
      await new Promise(resolve => setImmediate(resolve));
      subject.next('a');
      subject.next('b');
      subject.next(null);
      flush();
      expect(errors).toEqual([]);
      flush();
      await result;

      expect(written).toEqual(['a', 'b']);
      expect(errors).toEqual([nullResponseError]);
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

    it('should nullify grpcClient even if tryShutdown fails', async () => {
      const grpcClient = {
        forceShutdown: vi.fn(),
        tryShutdown: vi
          .fn()
          .mockImplementation((cb: (err: Error) => void) =>
            cb(new Error('shutdown failed')),
          ),
      };
      untypedServer.grpcClient = grpcClient;
      untypedServer.options.gracefulShutdown = true;

      await server.close().catch(() => {});

      expect(untypedServer.grpcClient).toBeNull();
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

  describe('lookupPackage', () => {
    it('should return root package in case package name is not defined', () => {
      const root = {};

      expect(server.lookupPackage(root, undefined!)).toBe(root);
      expect(server.lookupPackage(root, '')).toBe(root);
    });

    it('should return nested package when fully resolvable', () => {
      const root = { a: { b: { service: {} } } };

      expect(server.lookupPackage(root, 'a.b.service')).toBe(root.a.b.service);
    });

    it('should return undefined when a namespace segment is missing', () => {
      const root = { a: { c: {} } };

      expect(server.lookupPackage(root, 'a.b.c')).toBeUndefined();
    });
  });
});
