import * as sinon from 'sinon';
import { expect } from 'chai';
import { ClientGrpcProxy } from '../../client/client-grpc';
import { join } from 'path';
import { InvalidGrpcServiceException } from '../../exceptions/invalid-grpc-service.exception';
import { Observable } from 'rxjs';
import { InvalidGrpcPackageException } from '../../exceptions/invalid-grpc-package.exception';

class GrpcService {
  test = null;
}

describe('ClientGrpcProxy', () => {
  let client: ClientGrpcProxy;

  beforeEach(() => {
    client = new ClientGrpcProxy({
      options: {
        protoPath: join(__dirname, './test.proto'),
        package: 'test',
      }
    });
  });

  describe('getService', () => {
    describe('when "grpcClient[name]" is nil', () => {
      it('should throw "InvalidGrpcServiceException"', () => {
        (client as any).grpcClient = {};
        expect(() => client.getService('test')).to.throw(InvalidGrpcServiceException);
      });
    });
    describe('when "grpcClient[name]" is not nil', () => {
      it('should create grpcService', () => {
        (client as any).grpcClient = {
          'test': GrpcService,
        };
        expect(() => client.getService('test')).to.not.throw(InvalidGrpcServiceException);
      });
    });
  });

  describe('createServiceMethod', () => {
    const methodName = 'test';
    describe('when method is a response stream', () => {
      it('should call "createStreamServiceMethod"', () => {
        const cln = { [methodName]: { responseStream: true } };
        const spy = sinon.spy(client, 'createStreamServiceMethod');
        client.createServiceMethod(cln, methodName);

        expect(spy.called).to.be.true;
      });
    });
    describe('when method is not a response stream', () => {
      it('should call "createUnaryServiceMethod"', () => {
        const cln = { [methodName]: { responseStream: false } };
        const spy = sinon.spy(client, 'createUnaryServiceMethod');
        client.createServiceMethod(cln, methodName);
        
        expect(spy.called).to.be.true;
      });
    });
  });

  describe('createStreamServiceMethod', () => {
    it('should return observable', () => {
      const fn = client.createStreamServiceMethod({}, 'method');
      expect(fn()).to.be.instanceof(Observable);
    });
    describe('on subscribe', () => {
      const methodName = 'm';
      const obj = { [methodName]: () => ({ on: (type, fn) => fn() }) };

      let stream$: Observable<any>;
    
      beforeEach(() => {
        stream$ = client.createStreamServiceMethod(obj, methodName)();
      });

      it('should call native method', () => {
        const spy = sinon.spy(obj, methodName);
        stream$.subscribe(() => ({}), () => ({}));

        expect(spy.called).to.be.true;
      });
    });
  });

  describe('createUnaryServiceMethod', () => {
    it('should return observable', () => {
      const fn = client.createUnaryServiceMethod({}, 'method');
      expect(fn()).to.be.instanceof(Observable);
    });
    describe('on subscribe', () => {
      const methodName = 'm';
      const obj = { [methodName]: (callback) => callback(null, {}) };

      let stream$: Observable<any>;
    
      beforeEach(() => {
        stream$ = client.createUnaryServiceMethod(obj, methodName)();
      });

      it('should call native method', () => {
        const spy = sinon.spy(obj, methodName);
        stream$.subscribe(() => ({}), () => ({}));

        expect(spy.called).to.be.true;
      });
    });
  });

  describe('createClient', () => {
    describe('when package does not exist', () => {
      it('should throw "InvalidGrpcPackageException"', () => {
        sinon.stub(client, 'lookupPackage').callsFake(() => null);
        expect(() => client.createClient()).to.throw(InvalidGrpcPackageException);
      });
    });
  });

  describe('close', () => {
    it('should call "close" method', () => {
      const grpcClient = { close: sinon.spy() };
      (client as any).grpcClient = grpcClient;

      client.close();
      expect(grpcClient.close.called).to.be.true;
    });
  });

  describe('publish', () => {
    it('should throw exception', () => {
      expect(client['publish'](null, null)).to.eventually.throws(Error);
    });
  });
});
