import { Logger } from '@nestjs/common';
import { expect } from 'chai';
import { join } from 'path';
import { Observable } from 'rxjs';
import * as sinon from 'sinon';
import { ClientGrpcProxy } from '../../client/client-grpc';
import { InvalidGrpcPackageException } from '../../errors/invalid-grpc-package.exception';
import { InvalidGrpcServiceException } from '../../errors/invalid-grpc-service.exception';
import { InvalidProtoDefinitionException } from '../../errors/invalid-proto-definition.exception';

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
  let clientMulti: ClientGrpcProxy;

  beforeEach(() => {
    client = new ClientGrpcProxy({
      protoPath: join(__dirname, './test.proto'),
      package: 'test',
    });

    clientMulti = new ClientGrpcProxy({
      protoPath: ['test.proto', 'test2.proto'],
      package: ['test', 'test2'],
      loader: {
        includeDirs: [join(__dirname, '.')],
      },
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

      it('should throw "InvalidGrpcServiceException" (multiple proto)', () => {
        (clientMulti as any).grpcClient = {};

        expect(() => clientMulti.getService('test')).to.throw(
          InvalidGrpcServiceException,
        );

        expect(() => clientMulti.getService('test2')).to.throw(
          InvalidGrpcServiceException,
        );
      });
    });
    describe('when "grpcClient[name]" is not nil', () => {
      it('should create grpcService', () => {
        (client as any).grpcClients[0] = {
          test: GrpcService,
        };
        expect(() => client.getService('test')).to.not.throw(
          InvalidGrpcServiceException,
        );
      });

      describe('when "grpcClient[name]" is not nil (multiple proto)', () => {
        it('should create grpcService', () => {
          (clientMulti as any).grpcClients[0] = {
            test: GrpcService,
            test2: GrpcService,
          };
          expect(() => clientMulti.getService('test')).to.not.throw(
            InvalidGrpcServiceException,
          );
          expect(() => clientMulti.getService('test2')).to.not.throw(
            InvalidGrpcServiceException,
          );
        });
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
      const methodKey = 'method';
      const fn = client.createStreamServiceMethod(
        { [methodKey]: {} },
        methodKey,
      );
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
        stream$.subscribe(
          () => ({}),
          () => ({}),
        );

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
      let obj, dataSpy, errorSpy, completeSpy;

      let stream$: Observable<any>;

      beforeEach(() => {
        dataSpy = sinon.spy();
        errorSpy = sinon.spy();
        completeSpy = sinon.spy();

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
      const methodKey = 'method';
      const fn = client.createUnaryServiceMethod(
        { [methodKey]: {} },
        methodKey,
      );
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
        stream$.subscribe(
          () => ({}),
          () => ({}),
        );

        expect(spy.called).to.be.true;
      });
    });
  });

  describe('createClients', () => {
    describe('when package does not exist', () => {
      it('should throw "InvalidGrpcPackageException"', () => {
        sinon.stub(client, 'lookupPackage').callsFake(() => null);
        (client as any).logger = new NoopLogger();

        try {
          client.createClients();
        } catch (err) {
          expect(err).to.be.instanceof(InvalidGrpcPackageException);
        }
      });
    });
  });

  describe('loadProto', () => {
    describe('when proto is invalid', () => {
      it('should throw InvalidProtoDefinitionException', () => {
        sinon.stub(client, 'getOptionsProp' as any).callsFake(() => {
          throw new Error();
        });
        (client as any).logger = new NoopLogger();
        expect(() => client.loadProto()).to.throws(
          InvalidProtoDefinitionException,
        );
      });
    });
  });
  describe('close', () => {
    it('should call "close" method', () => {
      const grpcClient = { close: sinon.spy() };
      (client as any).grpcClients[0] = grpcClient;

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
      client.connect().catch(error => expect(error).to.be.instanceof(Error));
    });
  });

  describe('dispatchEvent', () => {
    it('should throw exception', () => {
      client['dispatchEvent'](null).catch(error =>
        expect(error).to.be.instanceof(Error),
      );
    });
  });
});
