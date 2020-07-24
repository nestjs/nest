import { Logger } from '@nestjs/common';
import { expect } from 'chai';
import { join } from 'path';
import { of } from 'rxjs';
import * as sinon from 'sinon';
import { CANCEL_EVENT } from '../../constants';
import { InvalidGrpcPackageException } from '../../errors/invalid-grpc-package.exception';
import { GrpcMethodStreamingType } from '../../index';
import { ServerGrpc } from '../../server/server-grpc';

class NoopLogger extends Logger {
  log(message: any, context?: string): void {
  }

  error(message: any, trace?: string, context?: string): void {
  }

  warn(message: any, context?: string): void {
  }
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
        .callsFake(() => ({} as any));
    });

    it('should call "bindEvents"', async () => {
      await server.listen(callback);
      expect(bindEventsStub.called).to.be.true;
    });
    it('should call "client.start"', async () => {
      const client = { start: sinon.spy() };
      sinon.stub(server, 'createClient').callsFake(() => client);

      await server.listen(callback);
      expect(client.start.called).to.be.true;
    });
    it('should call callback', async () => {
      await server.listen(callback);
      expect(callback.called).to.be.true;
    });
  });

  describe('listen (multiple proto)', () => {
    let callback: sinon.SinonSpy;
    let bindEventsStub: sinon.SinonStub;

    beforeEach(() => {
      callback = sinon.spy();
      bindEventsStub = sinon
        .stub(serverMulti, 'bindEvents')
        .callsFake(() => ({} as any));
    });

    it('should call "bindEvents"', async () => {
      await serverMulti.listen(callback);
      expect(bindEventsStub.called).to.be.true;
    });
    it('should call "client.start"', async () => {
      const client = { start: sinon.spy() };
      sinon.stub(serverMulti, 'createClient').callsFake(() => client);

      await serverMulti.listen(callback);
      expect(client.start.called).to.be.true;
    });
    it('should call callback', async () => {
      await serverMulti.listen(callback);
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
        .callsFake(() => ({} as any));
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

        sinon.stub(server, 'createServiceMethod').callsFake(() => ({} as any));
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

        sinon.stub(server, 'createServiceMethod').callsFake(() => ({} as any));
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
          write: sinon.spy(),
          end: sinon.spy(),
          addListener: sinon.spy(),
          removeListener: sinon.spy(),
        };
        const callback = sinon.spy();
        const native = sinon.spy();

        await server.createStreamServiceMethod(native)(call, callback);
        expect(native.called).to.be.true;
        expect(call.addListener.calledWith('cancelled')).to.be.true;
        expect(call.removeListener.calledWith('cancelled')).to.be.true;
      });

      it(`should close the result observable when receiving an 'cancelled' event from the client`, async () => {
        let cancelCb: () => void;
        const call = {
          write: sinon
            .stub()
            .onSecondCall()
            .callsFake(() => cancelCb()),
          end: sinon.spy(),
          addListener: (name, cb) => (cancelCb = cb),
          removeListener: sinon.spy(),
        };
        const result$ = of(1, 2, 3);
        const callback = sinon.spy();
        const native = sinon
          .stub()
          .returns(new Promise((resolve, reject) => resolve(result$)));

        await server.createStreamServiceMethod(native)(call, callback);
        expect(call.write.calledTwice).to.be.true;
        expect(call.end.called).to.be.true;
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
        sendMetadata: sinon.spy(),
      };
      fn(call as any, sinon.spy());

      expect(handler.called).to.be.true;
      expect(handler.args[0][1]).to.eql(call.metadata);
      expect(handler.args[0][2]).to.be.an.instanceof(Function);
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
          write: sinon.spy(),
        };

        const responseCallback = sinon.spy();
        await fn(call as any, responseCallback);

        expect(responseCallback.called).to.be.true;
      });
      describe('when response is a stream', () => {
        it('should call write() and end()', async () => {
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
            write: sinon.spy(),
          };

          await fn(call as any, null);

          expect(call.write.called).to.be.true;
          expect(call.end.called).to.be.true;
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

  describe('close', () => {
    it('should call "forceShutdown"', () => {
      const grpcClient = { forceShutdown: sinon.spy() };
      (server as any).grpcClient = grpcClient;
      server.close();
      expect(grpcClient.forceShutdown.called).to.be.true;
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
    const callback = () => {
      },
      pattern = { test: 'test pattern' };

    it(`should add handler`, () => {
      sinon.stub(server as any, 'messageHandlers').value({
        set() {
        },
      });

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
