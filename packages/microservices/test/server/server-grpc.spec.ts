import { Logger } from '@nestjs/common';
import { expect } from 'chai';
import { join } from 'path';
import { ReplaySubject, Subject, throwError } from 'rxjs';
import * as sinon from 'sinon';
import { CANCEL_EVENT } from '../../constants';
import { InvalidGrpcPackageException } from '../../errors/invalid-grpc-package.exception';
import { InvalidProtoDefinitionException } from '../../errors/invalid-proto-definition.exception';
import * as grpcHelpers from '../../helpers/grpc-helpers';
import { GrpcMethodStreamingType } from '../../index';
import { ServerGrpc } from '../../server';

class NoopLogger extends Logger {
  log(message: any, context?: string): void {}
  error(message: any, trace?: string, context?: string): void {}
  warn(message: any, context?: string): void {}
}

describe('ServerGrpc', () => {
  let server: ServerGrpc;
  let serverMulti: ServerGrpc;

  beforeEach(() => {
    server = new ServerGrpc({
      protoPath: join(__dirname, './test.proto'),
      package: 'test',
    } as any);

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
    it('should call "client.start"', async () => {
      const client = { start: sinon.spy() };
      sinon.stub(server, 'createClient').callsFake(async () => client);

      await server.listen(callback);
      expect(client.start.called).to.be.true;
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
    it('should call "client.start"', async () => {
      const client = { start: sinon.spy() };
      sinon.stub(serverMulti, 'createClient').callsFake(async () => client);
      await serverMulti.listen(callback);
      expect(client.start.called).to.be.true;
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
        (server as any).logger = new NoopLogger();
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
        (server as any).grpcClient = { addService: sinon.spy() };

        await server.bindEvents();
        expect((server as any).grpcClient.addService.calledTwice).to.be.true;
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
      (server as any).messageHandlers = handlers;
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
        (server as any).messageHandlers = handlers;
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
          .returns('test2');

        sinon.stub(server, 'createServiceMethod').callsFake(() => ({}) as any);
        (server as any).messageHandlers = handlers;
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
        const call = { write: sinon.spy(), end: sinon.spy() };
        const callback = sinon.spy();
        const native = sinon.spy();

        await server.createUnaryServiceMethod(native)(call, callback);
        expect(native.called).to.be.true;
        expect(callback.called).to.be.true;
      });

      it('should await when a promise is return by the native', async () => {
        const call = { write: sinon.spy(), end: sinon.spy() };
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
    it('should wrap call into Subject', () => {
      const handler = sinon.spy();
      const fn = server.createRequestStreamMethod(handler, false);
      const call = {
        on: (event, callback) => callback(),
        off: sinon.spy(),
        end: sinon.spy(),
        write: sinon.spy(),
      };
      fn(call as any, sinon.spy());

      expect(handler.called).to.be.true;
    });

    it('should wrap call into Subject with metadata', () => {
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
      fn(call as any, sinon.spy());

      expect(handler.called).to.be.true;
      expect(handler.args[0][1]).to.eq(call.metadata);
    });

    describe('when response is not a stream', () => {
      it('should call callback', async () => {
        const handler = async () => ({ test: true });
        const fn = server.createRequestStreamMethod(handler, false);
        const call = {
          on: (event, callback) => {
            if (event !== CANCEL_EVENT) {
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
            if (event !== CANCEL_EVENT) {
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
            emitter.dispatchEvent(new Event(CANCEL_EVENT));
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

          const serviceMethod = await server.createRequestStreamMethod(
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
              if (event !== CANCEL_EVENT) {
                callback();
              }
            },
            off: sinon.spy(),
            end: sinon.spy(),
            write: sinon.spy(() => true),
          };

          await fn(call as any, null);

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
    it('should pass through to "methodHandler"', () => {
      const handler = sinon.spy();
      const fn = server.createStreamCallMethod(handler, false);
      const args = [1, 2, 3];
      fn(args as any, sinon.spy());

      expect(handler.calledWith(args)).to.be.true;
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
        (server as any).logger = new NoopLogger();
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
      (server as any).grpcClient = grpcClient;
      await server.close();
      expect(grpcClient.forceShutdown.called).to.be.true;
      expect(grpcClient.tryShutdown.called).to.be.false;
    });

    it('should call "forceShutdown" when "gracefulShutdown" is false', async () => {
      const grpcClient = {
        forceShutdown: sinon.spy(),
        tryShutdown: sinon.stub().yields(),
      };
      (server as any).grpcClient = grpcClient;
      (server as any).options.gracefulShutdown = false;
      await server.close();
      expect(grpcClient.forceShutdown.called).to.be.true;
      expect(grpcClient.tryShutdown.called).to.be.false;
    });

    it('should call "tryShutdown" when "gracefulShutdown" is true', async () => {
      const grpcClient = {
        forceShutdown: sinon.spy(),
        tryShutdown: sinon.stub().yields(),
      };
      (server as any).grpcClient = grpcClient;
      (server as any).options.gracefulShutdown = true;
      await server.close();
      expect(grpcClient.forceShutdown.called).to.be.false;
      expect(grpcClient.tryShutdown.called).to.be.true;
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
        (server as any).messageHandlers,
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
