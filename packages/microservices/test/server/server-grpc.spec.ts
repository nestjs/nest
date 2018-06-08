import { ServerGrpc } from '../../server/server-grpc';
import { expect } from 'chai';
import * as sinon from 'sinon';
import { Observable } from 'rxjs';
import { join } from 'path';
import { InvalidGrpcPackageException } from '../../exceptions/invalid-grpc-package.exception';

describe('ServerGrpc', () => {
  let server: ServerGrpc;
  beforeEach(() => {
    server = new ServerGrpc({
      options: {
        protoPath: join(__dirname, './test.proto'),
        package: 'test',
      },
    } as any);
  });

  describe('listen', () => {
    let callback: sinon.SinonSpy;
    let bindEventsStub: sinon.SinonStub;

    beforeEach(() => {
      callback = sinon.spy();
      bindEventsStub = sinon.stub(server, 'bindEvents').callsFake(() => ({}));
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

  describe('bindEvents', () => {
    describe('when package does not exist', () => {
      it('should throw "InvalidGrpcPackageException"', () => {
        sinon.stub(server, 'lookupPackage').callsFake(() => null);
        expect(server.bindEvents()).to.eventually.throws(
          InvalidGrpcPackageException,
        );
      });
    });
    describe('when package exist', () => {
      it('should call "addService"', async () => {
        const serviceNames = ['test', 'test2'];
        sinon.stub(server, 'lookupPackage').callsFake(() => ({
          test: true,
          test2: true,
        }));
        sinon.stub(server, 'getServiceNames').callsFake(() => serviceNames);

        (server as any).grpcClient = { addService: sinon.spy() };

        await server.bindEvents();
        expect((server as any).grpcClient.addService.calledTwice).to.be.true;
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
      const expected = ['key', 'key2'];
      expect(server.getServiceNames(obj)).to.be.eql(expected);
    });
  });

  describe('createService', () => {
    it('should call "createServiceMethod"', async () => {
      const handlers = {
        test: null,
        test2: () => ({}),
      };
      sinon
        .stub(server, 'createPattern')
        .onFirstCall()
        .returns('test')
        .onSecondCall()
        .returns('test2');

      const spy = sinon
        .stub(server, 'createServiceMethod')
        .callsFake(() => ({}));

      (server as any).messageHandlers = handlers;
      await server.createService(
        {
          prototype: { test: true, test2: true },
        },
        'name',
      );
      expect(spy.calledOnce).to.be.true;
    });
  });

  describe('createPattern', () => {
    it('should return pattern', () => {
      const service = 'test';
      const method = 'method';
      expect(server.createPattern(service, method)).to.be.eql(
        JSON.stringify({
          service,
          rpc: method,
        }),
      );
    });
  });

  describe('createServiceMethod', () => {
    describe('when method is a response stream', () => {
      it('should call "createStreamServiceMethod"', () => {
        const cln = sinon.spy();
        const spy = sinon.spy(server, 'createStreamServiceMethod');
        server.createServiceMethod(cln, { responseStream: true } as any);

        expect(spy.called).to.be.true;
      });
    });
    describe('when method is not a response stream', () => {
      it('should call "createUnaryServiceMethod"', () => {
        const cln = sinon.spy();
        const spy = sinon.spy(server, 'createUnaryServiceMethod');
        server.createServiceMethod(cln, { responseStream: false } as any);

        expect(spy.called).to.be.true;
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
});
