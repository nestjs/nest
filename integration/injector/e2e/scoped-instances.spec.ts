import { createContextId } from '@nestjs/core';
import { InvalidClassScopeException } from '@nestjs/core/errors/exceptions/invalid-class-scope.exception';
import { Test, TestingModule } from '@nestjs/testing';
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

    expect(transient1).toBeInstanceOf(TransientService);
    expect(transient2).toBeInstanceOf(TransientService);
    expect(transient1).toEqual(transient2);
    expect(transientFactory).toBeTruthy();
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

    expect(transientTwoDepthLevel.svc.logger).not.toBeUndefined()
    expect(transientThreeDepthLevel.svc.svc.logger).not.toBeUndefined()
  });

  it('should dynamically resolve request-scoped provider', async () => {
    const request1 = await testingModule.resolve(ScopedService);
    const request2 = await testingModule.resolve(ScopedService);

    const ctxId = { id: 1 };
    const requestProvider = { host: 'localhost' };
    testingModule.registerRequestByContextId(requestProvider, ctxId);

    const request3 = await testingModule.resolve(ScopedService, ctxId);
    const requestFactory = await testingModule.resolve(REQUEST_SCOPED_FACTORY);

    expect(request1).toBeInstanceOf(ScopedService);
    expect(request2).toBeInstanceOf(ScopedService);
    expect(request3).not.toEqual(request2);
    expect(requestFactory).toBeTruthy()
    expect(request3.request).toEqual(requestProvider);
  });

  it.only('should dynamically resolve request-scoped controller', async () => {
    const request1 = await testingModule.resolve(ScopedController);
    const request2 = await testingModule.resolve(ScopedController);
    const request3 = await testingModule.resolve(ScopedController, { id: 1 });
    expect(request1).toBeInstanceOf(ScopedController);
    expect(request2).toBeInstanceOf(ScopedController);
    expect(request3 === request2).toBeFalsy();
  });

  it('should throw an exception when "get()" method is used for scoped providers', () => {
    try {
      testingModule.get(ScopedController);
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidClassScopeException);
    }
  });

  it('should throw an exception when "resolve()" method is used for static providers', async () => {
    try {
      await testingModule.resolve(STATIC_FACTORY);
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidClassScopeException);
    }
  });
});
