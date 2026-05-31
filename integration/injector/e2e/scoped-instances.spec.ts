import { createContextId } from '@nestjs/core';
import { InvalidClassScopeException } from '@nestjs/core/errors/exceptions/invalid-class-scope.exception';
import { Test, TestingModule } from '@nestjs/testing';
import { expect } from 'chai';
import { ScopedController } from '../src/scoped/scoped.controller';
import {
  REQUEST_SCOPED_FACTORY,
  ScopedModule,
  STATIC_FACTORY,
  TRANSIENT_SCOPED_FACTORY,
} from '../src/scoped/scoped.module';
import { ScopedService } from '../src/scoped/scoped.service';
import { TransientService } from '../src/scoped/transient.service';
import { Transient3Service } from '../src/scoped/transient3.service';

describe('Scoped Instances', () => {
  const OVERLAP_REQUEST_COUNT = 1000;
  let testingModule: TestingModule;

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      imports: [ScopedModule],
    }).compile();
  });

  it('should dynamically resolve transient provider', async () => {
    const contextId = createContextId();
    const transient1 = await testingModule.resolve(TransientService, contextId);
    const transient2 = await testingModule.resolve(TransientService, contextId);
    const transientFactory = await testingModule.resolve(
      TRANSIENT_SCOPED_FACTORY,
    );

    expect(transient1).to.be.instanceOf(TransientService);
    expect(transient2).to.be.instanceOf(TransientService);
    expect(transient1).to.be.equal(transient2);
    expect(transientFactory).to.be.true;
  });

  it('should dynamically resolve nested transient provider', async () => {
    const contextId = createContextId();
    const transientTwoDepthLevel = await testingModule.resolve(
      TransientService,
      contextId,
    );
    const transientThreeDepthLevel = await testingModule.resolve(
      Transient3Service,
      contextId,
    );

    expect(transientTwoDepthLevel.svc.logger).to.not.be.undefined;
    expect(transientThreeDepthLevel.svc.svc.logger).to.not.be.undefined;
  });

  it('should dynamically resolve request-scoped provider', async () => {
    const request1 = await testingModule.resolve(ScopedService);
    const request2 = await testingModule.resolve(ScopedService);

    const ctxId = { id: 1 };
    const requestProvider = { host: 'localhost' };
    testingModule.registerRequestByContextId(requestProvider, ctxId);

    const request3 = await testingModule.resolve(ScopedService, ctxId);
    const requestFactory = await testingModule.resolve(REQUEST_SCOPED_FACTORY);

    expect(request1).to.be.instanceOf(ScopedService);
    expect(request2).to.be.instanceOf(ScopedService);
    expect(request3).to.not.be.equal(request2);
    expect(requestFactory).to.be.true;
    expect(request3.request).to.be.equal(requestProvider);
  });

  it('should isolate request-scoped providers across parallel context resolutions', async function () {
    this.timeout(20000);
    const contexts = Array.from(
      { length: OVERLAP_REQUEST_COUNT },
      (_, index) => {
        const contextId = createContextId();
        const requestProvider = { host: `parallel-host-${index}` };

        testingModule.registerRequestByContextId(requestProvider, contextId);
        return { contextId, requestProvider };
      },
    );

    const providers = await Promise.all(
      contexts.map(({ contextId }) =>
        testingModule.resolve(ScopedService, contextId),
      ),
    );

    expect(new Set(providers).size).to.equal(contexts.length);
    expect(providers.map(provider => provider.request)).to.deep.equal(
      contexts.map(({ requestProvider }) => requestProvider),
    );
  });

  it('should reuse request-scoped providers for parallel resolutions in the same context', async function () {
    this.timeout(20000);
    const contextId = createContextId();
    const requestProvider = { host: 'shared-host' };

    testingModule.registerRequestByContextId(requestProvider, contextId);

    const providers = await Promise.all(
      Array.from({ length: OVERLAP_REQUEST_COUNT }, () =>
        testingModule.resolve(ScopedService, contextId),
      ),
    );

    expect(new Set(providers).size).to.equal(1);
    expect(providers[0].request).to.equal(requestProvider);
  });

  it('should dynamically resolve request-scoped controller', async () => {
    const request1 = await testingModule.resolve(ScopedController);
    const request2 = await testingModule.resolve(ScopedController);
    const request3 = await testingModule.resolve(ScopedController, { id: 1 });

    expect(request1).to.be.instanceOf(ScopedController);
    expect(request2).to.be.instanceOf(ScopedController);
    expect(request3).to.not.be.equal(request2);
  });

  it('should isolate request-scoped controllers across parallel context resolutions', async function () {
    this.timeout(20000);
    const contexts = Array.from({ length: OVERLAP_REQUEST_COUNT }, () =>
      createContextId(),
    );

    const controllers = await Promise.all(
      contexts.map(contextId =>
        testingModule.resolve(ScopedController, contextId),
      ),
    );

    expect(new Set(controllers).size).to.equal(contexts.length);
  });

  it('should throw an exception when "get()" method is used for scoped providers', () => {
    try {
      testingModule.get(ScopedController);
    } catch (err) {
      expect(err).to.be.instanceOf(InvalidClassScopeException);
    }
  });

  it('should throw an exception when "resolve()" method is used for static providers', async () => {
    try {
      await testingModule.resolve(STATIC_FACTORY);
    } catch (err) {
      expect(err).to.be.instanceOf(InvalidClassScopeException);
    }
  });
});
