import { expect } from 'chai';
import { join } from 'path';
import { Observable } from 'rxjs';
import * as sinon from 'sinon';
import { ClientGrpcProxy } from '../../client/client-grpc';
import { InvalidGrpcPackageException } from '../../errors/invalid-grpc-package.exception';
import { InvalidGrpcServiceException } from '../../errors/invalid-grpc-service.exception';
import { InvalidProtoDefinitionException } from '../../errors/invalid-proto-definition.exception';
// tslint:disable:no-string-literal

class GrpcService {
  test = null;
}

describe('ClientGrpcProxy', () => {
  let client: ClientGrpcProxy;

  beforeEach(() => {
    client = new ClientGrpcProxy({
      protoPath: join(__dirname, './test.proto'),
      package: 'test',
    });
  });

  describe('getService', () => {
    describe('when "grpcClient[name]" is nil', () => {
      it('should throw "InvalidGrpcServiceException"', () => {
        (client as any).grpcClient = {};
        expect(() => client.getService('test')).to.throw(
          InvalidGrpcServiceException,
        );
      });
    });
    describe('when "grpcClient[name]" is not nil', () => {
      it('should create grpcService', () => {
        (client as any).grpcClient = {
          test: GrpcService,
        };
        expect(() => client.getService('test')).to.not.throw(
          InvalidGrpcServiceException,
        );
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

    describe('flow-control', () => {
      const methodName = 'm';
      type EvtCallback = (...args: any[]) => void;
      let callMock: {
        on: (type: string, fn: EvtCallback) => void;
        cancel: sinon.SinonSpy;
        finished: boolean;
        destroy: sinon.SinonSpy;
        removeAllListeners: sinon.SinonSpy;
      };
      let eventCallbacks: { [type: string]: EvtCallback };
      let obj;
      const dataSpy = sinon.spy();
      const errorSpy = sinon.spy();
      const completeSpy = sinon.spy();

      let stream$: Observable<any>;

      beforeEach(() => {
        dataSpy.reset();
        errorSpy.reset();
        completeSpy.reset();
        eventCallbacks = {};
        callMock = {
          on: (type, fn) => (eventCallbacks[type] = fn),
          cancel: sinon.spy(),
          finished: false,
          destroy: sinon.spy(),
          removeAllListeners: sinon.spy(),
        };
        obj = { [methodName]: () => callMock };
        stream$ = client.createStreamServiceMethod(obj, methodName)();
      });

      it('propagates server errors', () => {
        const err = new Error('something happened');
        stream$.subscribe(dataSpy, errorSpy, completeSpy);
        eventCallbacks.data('a');
        eventCallbacks.data('b');
        callMock.finished = true;
        eventCallbacks.error(err);
        eventCallbacks.data('c');

        expect(Object.keys(eventCallbacks).length).to.eq(3);
        expect(dataSpy.args).to.eql([['a'], ['b']]);
        expect(errorSpy.args[0][0]).to.eql(err);
        expect(completeSpy.called).to.be.false;
        expect(callMock.cancel.called).to.be.false;
      });

      it('handles client side cancel', () => {
        const grpcServerCancelErrMock = {
          details: 'Cancelled',
        };
        const subscription = stream$.subscribe(dataSpy, errorSpy);
        eventCallbacks.data('a');
        eventCallbacks.data('b');
        subscription.unsubscribe();
        eventCallbacks.error(grpcServerCancelErrMock);
        eventCallbacks.end();
        eventCallbacks.data('c');

        expect(callMock.cancel.called, 'should call call.cancel()').to.be.true;
        expect(callMock.destroy.called, 'should call call.destroy()').to.be
          .true;
        expect(dataSpy.args).to.eql([['a'], ['b']]);
        expect(errorSpy.called, 'should not error if client canceled').to.be
          .false;
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
      const obj = { [methodName]: callback => callback(null, {}) };

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
        expect(() => client.createClient()).to.throw(
          InvalidGrpcPackageException,
        );
      });
    });
  });

  describe('loadProto', () => {
    describe('when proto is invalid', () => {
      it('should throw InvalidProtoDefinitionException', () => {
        sinon.stub(client, 'getOptionsProp').callsFake(() => {
          throw new Error();
        });
        expect(() => client.loadProto()).to.throws(
          InvalidProtoDefinitionException,
        );
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
      expect(() => client['publish'](null, null)).to.throws(Error);
    });
  });

  describe('send', () => {
    it('should throw exception', () => {
      expect(() => client.send(null, null)).to.throws(Error);
    });
  });

  describe('connect', () => {
    it('should throw exception', () => {
      expect(client.connect()).to.eventually.throws(Error);
    });
  });
});
