import { Scope } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ScopedModule, STATIC_FACTORY } from '../src/scoped/scoped.module';
import { ScopedService } from '../src/scoped/scoped.service';
import { TransientService } from '../src/scoped/transient.service';

describe('Providers introspection', () => {
  let testingModule: TestingModule;
  let moduleRef: ModuleRef;

  beforeEach(async () => {
    testingModule = await Test.createTestingModule({
      imports: [ScopedModule],
    }).compile();
    moduleRef = testingModule.get(ModuleRef);
  });

  it('should properly introspect a transient provider', async () => {
    const introspectionResult = moduleRef.introspect(TransientService);
    expect(introspectionResult.scope).toEqual(Scope.TRANSIENT);
  });

  it('should properly introspect a singleton provider', async () => {
    const introspectionResult = moduleRef.introspect(STATIC_FACTORY);
    expect(introspectionResult.scope).toEqual(Scope.DEFAULT);
  });

  it('should properly introspect a request-scoped provider', async () => {
    const introspectionResult = moduleRef.introspect(ScopedService);
    expect(introspectionResult.scope).toEqual(Scope.REQUEST);
  });
});
