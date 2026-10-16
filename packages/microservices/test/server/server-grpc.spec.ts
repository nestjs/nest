import { Logger } from '@nestjs/common';
import { expect } from 'chai';
import { EventEmitter } from 'events';
import { join } from 'path';
import {
  BehaviorSubject,
  EMPTY,
  lastValueFrom,
  of,
  ReplaySubject,
  Subject,
  throwError,
} from 'rxjs';
import { ignoreElements, map, toArray } from 'rxjs/operators';
import * as sinon from 'sinon';
import { Writable } from 'stream';
import { InvalidGrpcPackageException } from '../../errors/invalid-grpc-package.exception';
import { InvalidProtoDefinitionException } from '../../errors/invalid-proto-definition.exception';
import * as grpcHelpers from '../../helpers/grpc-helpers';
import { GrpcMethodStreamingType } from '../../index';
import { ServerGrpc } from '../../server';

const CANCELLED_EVENT = 'cancelled';
const GRPC_STATUS_UNKNOWN = 2;
const GRPC_STATUS_INVALID_ARGUMENT = 3;
const GRPC_STATUS_INTERNAL = 13;

const internalError = {
  code: GRPC_STATUS_INTERNAL,
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
      protoPath: join(__dirname, './test.proto'),
      package: 'test',
    });
    untypedServer = server as any;

    serverMulti = new ServerGrpc({
      protoPath: ['test.proto', 'test2.proto'],
      package: ['test', 'test2'],
      loader: {
        includeDirs: [join(__dirname, '.')],
      },
    });
  });

  describe('listen', () => {
    let callback: sinon.SinonSpy;
    let bindEventsStub: sinon.SinonStub;

    beforeEach(() => {
      callback = sinon.spy();
      bindEventsStub = sinon
        .stub(server, 'bindEvents')
        .callsFake(() => ({}) as any);
    });

    it('should call "bindEvents"', async () => {
      await server.listen(callback);
      await server.close();
      expect(bindEventsStub.called).to.be.true;
    });
    it('should call callback', async () => {
      await server.listen(callback);
      await server.close();
      expect(callback.called).to.be.true;
    });
    describe('when "start" throws an exception', () => {
      it('should call callback with a thrown error as an argument', async () => {
        const error = new Error('random error');

        const callbackSpy = sinon.spy();
        sinon.stub(server, 'createClient').callsFake(async () => null);

        sinon.stub(server, 'start').callsFake(() => {
          throw error;
        });
        await server.listen(callbackSpy);
        expect(callbackSpy.calledWith(error)).to.be.true;
      });
    });
  });

  describe('listen (multiple proto)', () => {
    let callback: sinon.SinonSpy;
    let bindEventsStub: sinon.SinonStub;

    beforeEach(() => {
      callback = sinon.spy();
      bindEventsStub = sinon
        .stub(serverMulti, 'bindEvents')
        .callsFake(() => ({}) as any);
    });

    it('should call "bindEvents"', async () => {
      await serverMulti.listen(callback);
      await serverMulti.close();
      expect(bindEventsStub.called).to.be.true;
    });
    it('should call callback', async () => {
      await serverMulti.listen(callback);
      await serverMulti.close();
      expect(callback.called).to.be.true;
    });
  });

  describe('bindEvents', () => {
    beforeEach(() => {
      sinon.stub(server, 'loadProto').callsFake(() => ({}));
    });
    describe('when package does not exist', () => {
      it('should throw "InvalidGrpcPackageException"', async () => {
        sinon.stub(server, 'lookupPackage').callsFake(() => null);
        untypedServer.logger = new NoopLogger();
        try {
          await server.bindEvents();
        } catch (err) {
          expect(err).to.be.instanceOf(InvalidGrpcPackageException);
        }
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
        sinon.stub(server, 'lookupPackage').callsFake(() => ({
          test: { service: true },
          test2: { service: true },
        }));
        sinon.stub(server, 'getServiceNames').callsFake(() => serviceNames);
        untypedServer.grpcClient = { addService: sinon.spy() };

        await server.bindEvents();
        expect(untypedServer.grpcClient.addService.calledTwice).to.be.true;
      });
    });
  });

  describe('bindEvents (multiple proto)', () => {
    beforeEach(() => {
      sinon.stub(serverMulti, 'loadProto').callsFake(() => ({}));
    });
    describe('when package does not exist', () => {
      it('should throw "InvalidGrpcPackageException"', async () => {
        sinon.stub(serverMulti, 'lookupPackage').callsFake(() => null);
        (serverMulti as any).logger = new NoopLogger();
        try {
          await serverMulti.bindEvents();
        } catch (err) {
          expect(err).to.be.instanceOf(InvalidGrpcPackageException);
        }
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
        sinon.stub(serverMulti, 'lookupPackage').callsFake(() => ({
          test: { service: true },
        }));
        sinon
          .stub(serverMulti, 'getServiceNames')
          .callsFake(() => serviceNames);

        (serverMulti as any).grpcClient = { addService: sinon.spy() };

        await serverMulti.bindEvents();
        expect((serverMulti as any).grpcClient.addService.calledTwice).to.be
          .true;
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
      expect(server.getServiceNames(obj)).to.be.eql(expected);
    });
  });

  describe('createService', () => {
    const objectToMap = obj =>
      new Map(Object.keys(obj).map(key => [key, obj[key]]) as any);

    it('should call "createServiceMethod"', async () => {
      const handlers = objectToMap({
        test: null,
        test2: () => ({}),
      });
      sinon
        .stub(server, 'createPattern')
        .onFirstCall()
        .returns('test')
        .onSecondCall()
        .returns('test2');

      const spy = sinon
        .stub(server, 'createServiceMethod')
        .callsFake(() => ({}) as any);
      untypedServer.messageHandlers = handlers;
      await server.createService(
        {
          prototype: { test: true, test2: true },
        },
        'name',
      );
      expect(spy.calledOnce).to.be.true;
    });
    describe('when RX streaming', () => {
      it('should call "createPattern" with proper arguments', async () => {
        const handlers = objectToMap({
          test2: {
            requestStream: true,
          },
        });
        const createPatternStub = sinon
          .stub(server, 'createPattern')
          .onFirstCall()
          .returns('test2');

        sinon.stub(server, 'createServiceMethod').callsFake(() => ({}) as any);
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
        expect(
          createPatternStub.calledWith(
            'name',
            'test2',
            GrpcMethodStreamingType.RX_STREAMING,
          ),
        ).to.be.true;
      });
    });
    describe('when pass through streaming', () => {
      it('should call "createPattern" with proper arguments', async () => {
        const handlers = objectToMap({
          test2: {
            requestStream: true,
          },
        });
        const createPatternStub = sinon
          .stub(server, 'createPattern')
          .onFirstCall()
          .returns('_invalid')
          .onSecondCall()
          .returns('_invalid')
          .onThirdCall()
          .returns('test2');

        sinon.stub(server, 'createServiceMethod').callsFake(() => ({}) as any);
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
        expect(
          createPatternStub.calledWith(
            'name',
            'test2',
            GrpcMethodStreamingType.PT_STREAMING,
          ),
        ).to.be.true;
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
      ).not.to.be.undefined;
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
      ).not.to.be.undefined;
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
      ).to.be.undefined;
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
      ).to.be.eql(
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
        const cln = sinon.spy();
        const spy = sinon.spy(server, 'createStreamServiceMethod');
        server.createServiceMethod(
          cln,
          { responseStream: true } as any,
          GrpcMethodStreamingType.NO_STREAMING,
        );

        expect(spy.called).to.be.true;
      });
    });
    describe('when method is not a response stream', () => {
      it('should call "createUnaryServiceMethod"', () => {
        const cln = sinon.spy();
        const spy = sinon.spy(server, 'createUnaryServiceMethod');
        server.createServiceMethod(
          cln,
          { responseStream: false } as any,
          GrpcMethodStreamingType.NO_STREAMING,
        );

        expect(spy.called).to.be.true;
      });
    });
    describe('when request is a stream', () => {
      describe('when stream type is RX_STREAMING', () => {
        it('should call "createRequestStreamMethod"', () => {
          const cln = sinon.spy();
          const spy = sinon.spy(server, 'createRequestStreamMethod');
          server.createServiceMethod(
            cln,
            { requestStream: true } as any,
            GrpcMethodStreamingType.RX_STREAMING,
          );

          expect(spy.called).to.be.true;
        });
      });
      describe('when stream type is PT_STREAMING', () => {
        it('should call "createStreamCallMethod"', () => {
          const cln = sinon.spy();
          const spy = sinon.spy(server, 'createStreamCallMethod');
          server.createServiceMethod(
            cln,
            { requestStream: true } as any,
            GrpcMethodStreamingType.PT_STREAMING,
          );

          expect(spy.called).to.be.true;
        });
      });
    });
  });

  describe('createStreamServiceMethod', () => {
    it('should return function', () => {
      const fn = server.createStreamServiceMethod(sinon.spy());
      expect(fn).to.be.a('function');
    });

    describe('on call', () => {
      it('should call native method', async () => {
        const call = {
          write: sinon.spy(() => true),
          end: sinon.spy(),
          on: sinon.spy(),
          off: sinon.spy(),
        };
        const callback = sinon.spy();
        const native = sinon.spy();

        await server.createStreamServiceMethod(native)(call, callback);
        expect(native.called).to.be.true;
        expect(call.on.calledWith('cancelled')).to.be.true;
        expect(call.off.calledWith('cancelled')).to.be.true;
      });

      it('should handle error thrown in handler', async () => {
        const call = {
          write: sinon.spy(() => true),
          end: sinon.spy(),
          on: sinon.spy(),
          off: sinon.spy(),
          emit: sinon.spy(),
        };

        const callback = sinon.spy();
        const error = new Error('handler threw');
        const native = sinon.spy(() => throwError(() => error));

        // implicit assertion that this will never throw when call.emit emits an error event
        await server.createStreamServiceMethod(native)(call, callback);
        expect(native.called).to.be.true;
        expect(call.emit.calledWith('error', error)).to.be.ok;
        expect(call.end.called).to.be.true;
      });

      it(`should close the result observable when receiving an 'cancelled' event from the client`, async () => {
        const et = new EventTarget();
        const cancel = () => et.dispatchEvent(new Event('cancelled'));

        const written: any[] = [];
        const call = {
          write: sinon.spy((value: any) => {
            written.push(value);
            return true;
          }),
          end: sinon.spy(() => written.push('end')),
          on: sinon.spy((name, cb) => {
            et.addEventListener(name, cb);
          }),
          off: sinon.spy((name, cb) => {
            et.removeEventListener(name, cb);
          }),
        };

        const result$ = new Subject<number>();
        const resolvedObservable = Promise.resolve(result$);
        const callback = sinon.spy();
        const native = sinon.stub().returns(resolvedObservable);

        const result = server.createStreamServiceMethod(native)(call, callback);

        await resolvedObservable;

        result$.next(1);
        expect(written).to.deep.equal([1]);
        result$.next(2);
        expect(written).to.deep.equal([1, 2]);
        result$.next(3);
        expect(written).to.deep.equal([1, 2, 3]);
        cancel();
        result$.next(4);
        expect(written).to.deep.equal([1, 2, 3, 'end']);

        expect(call.end.called).to.be.true;
        expect(call.on.calledWith('cancelled')).to.be.true;
        expect(call.on.calledWith('drain')).to.be.true;
        expect(call.off.calledWith('cancelled')).to.be.true;
        expect(call.off.calledWith('drain')).to.be.true;

        await result;
      });
    });
  });

  describe('createUnaryServiceMethod', () => {
    it('should return observable', () => {
      const fn = server.createUnaryServiceMethod(sinon.spy());
      expect(fn).to.be.a('function');
    });
    describe('on call', () => {
      it('should call native & callback methods', async () => {
        const call = {
          write: sinon.spy(),
          end: sinon.spy(),
          on: sinon.spy(),
          off: sinon.spy(),
        };
        const callback = sinon.spy();
        const native = sinon.spy();

        await server.createUnaryServiceMethod(native)(call, callback);
        expect(native.called).to.be.true;
        expect(callback.called).to.be.true;
      });

      it('should call the processing end hook when the handler errors', async () => {
        const call = {
          request: { data: [1, 2, 3] },
          write: sinon.spy(),
          end: sinon.spy(),
          on: sinon.spy(),
          off: sinon.spy(),
        };
        const callback = sinon.spy();
        const error = new Error('handler threw');
        const native = sinon.stub().returns(throwError(() => error));
        let endHookArgs: unknown[] | undefined;

        (server as any).onProcessingEndHook = (...args: unknown[]) => {
          endHookArgs = args;
        };

        await server.createUnaryServiceMethod(native)(call as any, callback);

        expect(callback.calledWith(error)).to.be.true;
        expect(endHookArgs).to.not.be.undefined;
        expect(endHookArgs![0]).to.equal(server.transportId);
        expect(endHookArgs![1]).to.deep.equal(call.request);
      });

      it('should fail the call when the handler completes without a response', async () => {
        const call = {
          write: sinon.spy(),
          end: sinon.spy(),
          on: sinon.spy(),
          off: sinon.spy(),
        };
        const callback = sinon.spy();

        await server.createUnaryServiceMethod(() => EMPTY)(call, callback);

        expect(callback.calledOnce).to.be.true;
        expect(callback.firstCall.args).to.eql([
          {
            code: GRPC_STATUS_INTERNAL,
            details: 'The handler completed without emitting a response',
          },
        ]);
      });

      it('should await when a promise is return by the native', async () => {
        const call = {
          write: sinon.spy(),
          end: sinon.spy(),
          on: sinon.spy(),
          off: sinon.spy(),
        };
        const callback = sinon.spy();

        const original = { native: Function };
        const mock = sinon.mock(original);

        mock
          .expects('native')
          .once()
          .returns(
            (() => {
              const sub = new ReplaySubject<any>(1);
              sub.next(new Promise(resolve => resolve({ foo: 'bar' })));
              return sub.asObservable();
            })(),
          );

        await server.createUnaryServiceMethod(original.native)(call, callback);
        mock.verify();
        expect(callback.calledWith(null, { foo: 'bar' })).to.be.true;
      });
    });
  });

  describe('createRequestStreamMethod', () => {
    it('should wrap call into Subject', async () => {
      const handler = sinon.spy();
      const fn = server.createRequestStreamMethod(handler, false);
      const call = {
        on: (event, callback) => callback(),
        off: sinon.spy(),
        end: sinon.spy(),
        write: sinon.spy(),
      };
      await fn(call as any, sinon.spy());

      expect(handler.called).to.be.true;
    });

    it('should wrap call into Subject with metadata', async () => {
      const handler = sinon.spy();
      const fn = server.createRequestStreamMethod(handler, false);
      const call = {
        on: (event, callback) => callback(),
        off: sinon.spy(),
        end: sinon.spy(),
        write: sinon.spy(),
        metadata: {
          test: '123',
        },
      };
      await fn(call as any, sinon.spy());

      expect(handler.called).to.be.true;
      expect(handler.args[0][1]).to.eq(call.metadata);
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
          off: sinon.spy(),
          end: sinon.spy(),
          write: sinon.spy(() => false),
        };

        const responseCallback = sinon.spy();
        await fn(call as any, responseCallback);

        expect(responseCallback.called).to.be.true;
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
          off: sinon.spy(),
          end: sinon.spy(),
          write: sinon.spy(),
        };

        const responseCallback = sinon.spy();
        await fn(call as any, responseCallback);

        expect(responseCallback.calledOnce).to.be.true;
        expect(responseCallback.firstCall.args).to.eql([error, null]);
      });

      it('should fail the call when the handler completes without a response', async () => {
        const endHook = sinon.spy();
        untypedServer.onProcessingEndHook = endHook;
        const call = Object.assign(new EventEmitter(), {
          request: { data: [] },
          metadata: {},
          write: sinon.spy(() => true),
          end: sinon.spy(),
        });
        const callback = sinon.spy();

        const result = server.createRequestStreamMethod((stream: any) => {
          stream.drainBuffer?.();
          return stream.pipe(ignoreElements());
        }, false)(call as any, callback);
        await new Promise(resolve => setImmediate(resolve));
        call.emit('data', 'x');
        call.emit('end');
        await result;

        expect(callback.calledOnce).to.be.true;
        expect(callback.firstCall.args).to.eql([
          {
            code: GRPC_STATUS_INTERNAL,
            details: 'The handler completed without emitting a response',
          },
          null,
        ]);
        expect(endHook.calledOnceWithExactly(server.transportId, call.request))
          .to.be.true;
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
            write: sinon.spy(value => {
              // Simulating a writable stream becoming overwhelmed.
              if (writeCounter++ < highwaterMark) {
                // We can write this value to the stream.
                written.push(value);
              }
              // But as soon as we pass the highwater mark, we can't write anymore.
              return writeCounter < highwaterMark;
            }),
            end: sinon.spy(() => {
              written.push('end');
            }),
            emit: sinon.spy(),
            request: sinon.spy(),
            metadata: sinon.spy(),
            sendMetadata: sinon.spy(),
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

          const callback = sinon.spy();

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
            off: sinon.spy(),
            end: sinon.spy(),
            write: sinon.spy(() => true),
          };

          await fn(call as any, null!);

          expect(call.write.called).to.be.true;
          expect(call.end.called).to.be.true;
        });

        it('should drain all values emitted from the observable while waiting for the drain event from the call', async () => {
          const { call, written, result, subject } = await createCall();

          subject.next('a');
          subject.next('b');
          expect(written).to.deep.equal(['a', 'b']);
          subject.next('c'); // can't be written yet.
          expect(written).to.deep.equal(['a', 'b']);
          call.fire.drain();
          subject.next('d');
          expect(written).to.deep.equal(['a', 'b', 'c', 'd']);
          subject.next('e'); // can't be written yet.
          expect(written).to.deep.equal(['a', 'b', 'c', 'd']);
          call.fire.drain();
          expect(written).to.deep.equal(['a', 'b', 'c', 'd', 'e']);
          subject.next('f');
          expect(written).to.deep.equal(['a', 'b', 'c', 'd', 'e', 'f']);
          subject.complete();
          expect(written).to.deep.equal(['a', 'b', 'c', 'd', 'e', 'f', 'end']);

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
            expect(written).to.deep.equal(['a', 'b']);
            call.fire.drain();
            expect(written).to.deep.equal(['a', 'b', 'c', 'd']);
            call.fire.drain();
            expect(written).to.deep.equal(['a', 'b', 'c', 'd', 'e']);
            subject.complete();
            expect(written).to.deep.equal(['a', 'b', 'c', 'd', 'e', 'end']);

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
          expect(written).to.deep.equal(['a', 'b']);
          call.fire.drain();
          expect(written).to.deep.equal(['a', 'b', 'c', 'd']);
          call.fire.drain();
          expect(written).to.deep.equal(['a', 'b', 'c', 'd', 'e', 'end']);

          return result;
        });

        it('should end the subscription to the source if the call is cancelled', async () => {
          const { call, subject, result } = await createCall();

          expect(subject.observed).to.be.true;
          call.fire.cancel();
          expect(subject.observed).to.be.false;
          expect(call.end.called).to.be.true;

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
          expect(written).to.deep.equal(['a', 'b']);
          call.fire.drain();
          expect(written).to.deep.equal(['a', 'b', 'c', 'd']);
          call.fire.drain();
          expect(written).to.deep.equal(['a', 'b', 'c', 'd', 'e', 'end']);

          try {
            await result;
          } catch (err) {
            expect(err).to.equal(error);
          }
        });
      });
    });
  });

  describe('createStreamCallMethod', () => {
    it('should pass through to "methodHandler"', async () => {
      const handler = sinon.spy();
      const fn = server.createStreamCallMethod(handler, false);
      const args = [1, 2, 3];
      await fn(args as any, sinon.spy());

      expect(handler.calledWith(args)).to.be.true;
    });

    describe('when the handler fails', () => {
      const error = new Error('handler rejected');
      let endHook: sinon.SinonSpy;

      beforeEach(() => {
        endHook = sinon.spy();
        untypedServer.onProcessingEndHook = endHook;
      });

      const createCall = () => ({
        request: { data: [1, 2, 3] },
        metadata: {},
        write: sinon.spy(() => true),
        end: sinon.spy(),
        on: sinon.spy(),
        off: sinon.spy(),
        emit: sinon.spy(),
      });

      it('should run the end hook once and emit the error on the call when the handler rejects', async () => {
        const call = createCall();

        const result = await server.createStreamCallMethod(async () => {
          throw error;
        }, true)(call as any, sinon.spy());

        expect(result).to.be.undefined;
        expect(call.emit.calledOnceWithExactly('error', error)).to.be.true;
        expect(endHook.calledOnceWithExactly(server.transportId, call.request))
          .to.be.true;
      });

      it('should pass the error to the callback when a request stream handler errors', async () => {
        const call = createCall();
        const callback = sinon.spy();

        const result = await server.createStreamCallMethod(
          async () => throwError(() => error),
          false,
        )(call as any, callback);

        expect(result).to.be.undefined;
        expect(callback.calledOnceWithExactly(error, null)).to.be.true;
        expect(call.emit.called).to.be.false;
        expect(endHook.calledOnceWithExactly(server.transportId, call.request))
          .to.be.true;
      });

      it('should resolve when the handler stream completes without emitting', async () => {
        const call = createCall();
        const callback = sinon.spy();

        const result = await server.createStreamCallMethod(() => EMPTY, false)(
          call as any,
          callback,
        );

        expect(result).to.be.undefined;
        expect(callback.called).to.be.false;
        expect(endHook.calledOnce).to.be.true;
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
      const endHook = sinon.spy();
      untypedServer.onProcessingEndHook = endHook;
      return endHook;
    }

    it('should unsubscribe from a response stream that has not emitted', async () => {
      const endHook = bindEndHook();
      const call = createCall();
      const callback = sinon.spy();
      const response$ = new Subject<string>();

      await server.createUnaryServiceMethod(() => response$)(call, callback);
      expect(response$.observed).to.be.true;
      cancelCall(call);

      expect(response$.observed).to.be.false;
      expect(callback.called).to.be.false;
      expect(endHook.calledOnceWithExactly(server.transportId, call.request)).to
        .be.true;
    });

    it('should unsubscribe from a response stream that stays open once the call is answered', async () => {
      const endHook = bindEndHook();
      const call = createCall();
      const callback = sinon.spy();
      const response$ = new BehaviorSubject('hero');

      await server.createUnaryServiceMethod(() => response$)(call, callback);
      await new Promise(resolve => setImmediate(resolve));
      expect(callback.calledOnceWithExactly(null, 'hero')).to.be.true;
      cancelCall(call);

      expect(response$.observed).to.be.false;
      expect(endHook.calledOnce).to.be.true;
    });

    it('should not subscribe to the response stream if the call was cancelled while the handler ran', async () => {
      const endHook = bindEndHook();
      const call = createCall({ cancelled: true });
      const callback = sinon.spy();
      const response$ = new Subject<string>();

      await server.createUnaryServiceMethod(() => response$)(call, callback);

      expect(response$.observed).to.be.false;
      expect(callback.called).to.be.false;
      expect(endHook.calledOnceWithExactly(server.transportId, call.request)).to
        .be.true;
    });
  });

  describe('when an error cannot be sent as it is', () => {
    // grpc-js throws on an error that is not an object ("'message' in
    // error") and on a status message with a lone surrogate ("encodeURI")
    const stringError = 'Forbidden resource';
    const sendableStringError = {
      code: GRPC_STATUS_UNKNOWN,
      message: 'Forbidden resource',
    };
    const loneSurrogateError = {
      code: GRPC_STATUS_INVALID_ARGUMENT,
      message: `Unexpected token '\ud83d', "😀" is not valid JSON`,
    };
    const sendableLoneSurrogateError = {
      code: GRPC_STATUS_INVALID_ARGUMENT,
      message: `Unexpected token '\ufffd', "😀" is not valid JSON`,
      details: undefined,
      metadata: undefined,
    };

    const createCall = () => ({
      request: {},
      metadata: {},
      write: sinon.spy(() => true),
      end: sinon.spy(),
      on: sinon.spy(),
      off: sinon.spy(),
      emit: sinon.spy(),
    });

    const cases: Array<[string, unknown, unknown]> = [
      ['a string', stringError, sendableStringError],
      ['a lone surrogate', loneSurrogateError, sendableLoneSurrogateError],
    ];

    cases.forEach(([name, error, sendableError]) => {
      it(`should send a unary call an error with ${name} that grpc-js can send`, async () => {
        const callback = sinon.spy();

        await server.createUnaryServiceMethod(() => throwError(() => error))(
          createCall(),
          callback,
        );

        expect(callback.calledOnce).to.be.true;
        expect(callback.firstCall.args).to.eql([sendableError]);
      });

      it(`should emit a response stream an error with ${name} that grpc-js can send`, async () => {
        const call = createCall();

        await server.createStreamServiceMethod(() => throwError(() => error))(
          call,
          sinon.spy(),
        );

        expect(call.emit.calledOnce).to.be.true;
        expect(call.emit.firstCall.args).to.eql(['error', sendableError]);
      });
    });

    it('should send a client stream call an error that grpc-js can send', async () => {
      const callback = sinon.spy();

      await server.createRequestStreamMethod(
        () => throwError(() => stringError),
        false,
      )(createCall() as any, callback);

      expect(callback.calledOnce).to.be.true;
      expect(callback.firstCall.args).to.eql([sendableStringError, null]);
    });

    it('should send a stream call an error that grpc-js can send', async () => {
      const callback = sinon.spy();
      const call = createCall();
      const handler = async () => throwError(() => loneSurrogateError);

      await server.createStreamCallMethod(handler, false)(
        call as any,
        callback,
      );
      await server.createStreamCallMethod(handler, true)(call as any, callback);

      expect(callback.calledOnce).to.be.true;
      expect(callback.firstCall.args).to.eql([
        sendableLoneSurrogateError,
        null,
      ]);
      expect(call.emit.calledOnce).to.be.true;
      expect(call.emit.firstCall.args).to.eql([
        'error',
        sendableLoneSurrogateError,
      ]);
    });

    it('should send an error that grpc-js can send as it is', async () => {
      const callback = sinon.spy();
      const error = new Error('well-formed 😀');

      await server.createUnaryServiceMethod(() => throwError(() => error))(
        createCall(),
        callback,
      );

      expect(callback.firstCall.args[0]).to.equal(error);
    });
  });

  // A rejection that escaped the exception filters (a filter that throws)
  // would otherwise go unhandled: grpc-js drops the promise
  describe('when the handler promise rejects', () => {
    const error = new Error('handler rejected');
    let endHook: sinon.SinonSpy;
    let loggerError: sinon.SinonStub;

    beforeEach(() => {
      endHook = sinon.spy();
      untypedServer.onProcessingEndHook = endHook;
      loggerError = sinon.stub(untypedServer.logger, 'error');
    });

    afterEach(() => loggerError.restore());

    const createCall = () => ({
      request: { data: [1, 2, 3] },
      metadata: {},
      write: sinon.spy(() => true),
      end: sinon.spy(),
      on: sinon.spy(),
      off: sinon.spy(),
      emit: sinon.spy(),
    });
    const rejectingResponse = () =>
      of('hero').pipe(
        map(async () => {
          throw error;
        }),
      );

    describe('createUnaryServiceMethod', () => {
      it('should run the end hook once and fail the call when the handler rejects', async () => {
        const call = createCall();
        const callback = sinon.spy();

        const result = await server.createUnaryServiceMethod(async () => {
          throw error;
        })(call as any, callback);

        expect(result).to.be.undefined;
        expect(callback.calledOnce).to.be.true;
        expect(callback.firstCall.args).to.eql([internalError]);
        expect(loggerError.calledOnceWithExactly(error)).to.be.true;
        expect(endHook.calledOnceWithExactly(server.transportId, call.request))
          .to.be.true;
      });

      it('should fail the call when a response promise rejects', async () => {
        const callback = sinon.spy();

        await server.createUnaryServiceMethod(rejectingResponse)(
          createCall() as any,
          callback,
        );
        await new Promise(resolve => setImmediate(resolve));

        expect(callback.calledOnce).to.be.true;
        expect(callback.firstCall.args).to.eql([internalError]);
        expect(loggerError.calledOnceWithExactly(error)).to.be.true;
      });
    });

    describe('createStreamServiceMethod', () => {
      it('should run the end hook once and fail the call when the handler rejects', async () => {
        const call = createCall();

        const result = await server.createStreamServiceMethod(async () => {
          throw error;
        })(call as any, sinon.spy());

        expect(result).to.be.undefined;
        expect(call.emit.calledOnce).to.be.true;
        expect(call.emit.firstCall.args).to.eql(['error', internalError]);
        expect(endHook.calledOnceWithExactly(server.transportId, call.request))
          .to.be.true;
      });
    });

    describe('createRequestStreamMethod', () => {
      it('should run the end hook once and fail the call when the call ends and the handler then rejects', async () => {
        const callback = sinon.spy();
        const call = {
          ...createCall(),
          // Fires every listener as soon as it is registered, so the call has
          // ended before the handler rejects
          on: (event: string, listener: () => void) => {
            if (event !== CANCELLED_EVENT) {
              listener();
            }
          },
        };

        const result = await server.createRequestStreamMethod(async () => {
          throw error;
        }, false)(call as any, callback);

        expect(result).to.be.undefined;
        expect(callback.calledOnce).to.be.true;
        expect(callback.firstCall.args).to.eql([internalError, null]);
        expect(endHook.calledOnceWithExactly(server.transportId, call.request))
          .to.be.true;
      });

      it('should fail the call when the call errors under a consuming handler', async () => {
        const call = Object.assign(new EventEmitter(), {
          request: { data: [] },
          metadata: {},
          write: sinon.spy(() => true),
          end: sinon.spy(),
        });
        const callback = sinon.spy();

        const result = server.createRequestStreamMethod((stream: any) => {
          stream.drainBuffer?.();
          return lastValueFrom(stream.pipe(toArray()));
        }, false)(call as any, callback);
        await new Promise(resolve => setImmediate(resolve));
        call.emit('error', new Error('boom'));

        expect(await result).to.be.undefined;
        expect(callback.calledOnce).to.be.true;
        expect(callback.firstCall.args).to.eql([internalError, null]);
      });

      it('should fail the call when the response promise rejects', async () => {
        const callback = sinon.spy();

        const result = await server.createRequestStreamMethod(
          rejectingResponse,
          false,
        )(createCall() as any, callback);

        expect(result).to.be.undefined;
        expect(callback.calledOnce).to.be.true;
        expect(callback.firstCall.args).to.eql([internalError, null]);
        expect(loggerError.calledOnceWithExactly(error)).to.be.true;
      });

      it('should fail a stream response call when the handler rejects', async () => {
        const call = createCall();

        const result = await server.createRequestStreamMethod(async () => {
          throw error;
        }, true)(call as any, sinon.spy());

        expect(result).to.be.undefined;
        expect(call.emit.calledOnce).to.be.true;
        expect(call.emit.firstCall.args).to.eql(['error', internalError]);
      });
    });
  });

  describe('when a response stream emits null', () => {
    const nullResponseError = {
      code: GRPC_STATUS_INTERNAL,
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
        sinon.spy(),
      );

      expect(written).to.deep.equal(['a']);
      expect(errors).to.deep.equal([nullResponseError]);
    });

    it('should fail the call once the responses before null are written', async () => {
      const { call, written, errors, flush } = createCall({
        highWaterMark: 1,
      });
      const subject = new Subject<string | null>();

      const result = server.createStreamServiceMethod(() => subject)(
        call,
        sinon.spy(),
      );
      await new Promise(resolve => setImmediate(resolve));
      subject.next('a');
      subject.next('b');
      subject.next(null);
      flush();
      expect(errors).to.deep.equal([]);
      flush();
      await result;

      expect(written).to.deep.equal(['a', 'b']);
      expect(errors).to.deep.equal([nullResponseError]);
    });
  });

  describe('loadProto', () => {
    describe('when proto is invalid', () => {
      it('should throw InvalidProtoDefinitionException', () => {
        const getPackageDefinitionStub = sinon.stub(
          grpcHelpers,
          'getGrpcPackageDefinition' as any,
        );
        getPackageDefinitionStub.callsFake(() => {
          throw new Error();
        });
        untypedServer.logger = new NoopLogger();
        expect(() => server.loadProto()).to.throws(
          InvalidProtoDefinitionException,
        );
        getPackageDefinitionStub.restore();
      });
    });
  });

  describe('close', () => {
    it('should call "forceShutdown" by default', async () => {
      const grpcClient = {
        forceShutdown: sinon.spy(),
        tryShutdown: sinon.stub().yields(),
      };
      untypedServer.grpcClient = grpcClient;
      await server.close();
      expect(grpcClient.forceShutdown.called).to.be.true;
      expect(grpcClient.tryShutdown.called).to.be.false;
    });

    it('should call "forceShutdown" when "gracefulShutdown" is false', async () => {
      const grpcClient = {
        forceShutdown: sinon.spy(),
        tryShutdown: sinon.stub().yields(),
      };
      untypedServer.grpcClient = grpcClient;
      untypedServer.options.gracefulShutdown = false;
      await server.close();
      expect(grpcClient.forceShutdown.called).to.be.true;
      expect(grpcClient.tryShutdown.called).to.be.false;
    });

    it('should call "tryShutdown" when "gracefulShutdown" is true', async () => {
      const grpcClient = {
        forceShutdown: sinon.spy(),
        tryShutdown: sinon.stub().yields(),
      };
      untypedServer.grpcClient = grpcClient;
      untypedServer.options.gracefulShutdown = true;
      await server.close();
      expect(grpcClient.forceShutdown.called).to.be.false;
      expect(grpcClient.tryShutdown.called).to.be.true;
    });

    it('should nullify grpcClient even if tryShutdown fails', async () => {
      const grpcClient = {
        forceShutdown: sinon.spy(),
        tryShutdown: sinon.stub().yields(new Error('shutdown failed')),
      };
      untypedServer.grpcClient = grpcClient;
      untypedServer.options.gracefulShutdown = true;

      await server.close().catch(() => {});

      expect(untypedServer.grpcClient).to.be.null;
    });
  });

  describe('deserialize', () => {
    it(`should return parsed json`, () => {
      const obj = { test: 'test' };
      expect(server.deserialize(obj)).to.deep.equal(
        JSON.parse(JSON.stringify(obj)),
      );
    });
    it(`should not parse argument if it is not an object`, () => {
      const content = 'test';
      expect(server.deserialize(content)).to.equal(content);
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
      expect(svcs.length).to.be.equal(
        2,
        'Amount of services collected from namespace should be equal 2',
      );
      expect(svcs[0].name).to.be.equal('A.C.E');
      expect(svcs[1].name).to.be.equal('B.D');
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
      expect(services.length).to.be.equal(
        2,
        'Amount of services collected from namespace should be equal 2',
      );
      expect(services[0].name).to.be.equal('A');
      expect(services[1].name).to.be.equal('B');
    });
  });

  describe('addHandler', () => {
    const callback = () => {},
      pattern = { test: 'test pattern' };

    it(`should add handler`, () => {
      sinon.stub(server as any, 'messageHandlers').value({ set() {} });

      const messageHandlersSetSpy = sinon.spy(
        untypedServer.messageHandlers,
        'set',
      );
      server.addHandler(pattern, callback as any);

      expect(messageHandlersSetSpy.called).to.be.true;
      expect(messageHandlersSetSpy.getCall(0).args[0]).to.be.equal(
        JSON.stringify(pattern),
      );
    });
  });
});
