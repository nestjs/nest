import { Inject, Injectable, Scope } from '@nestjs/common';
import { INQUIRER, ModuleRef } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { expect } from 'chai';

describe('Transient scope', () => {
  const SOME_TOKEN = Symbol('SomeToken');

  @Injectable({ scope: Scope.TRANSIENT })
  class TransientService {
    public context: string;

    constructor(
      @Inject(INQUIRER) private inquirer: any,
      @Inject(SOME_TOKEN) public token: string,
    ) {
      this.context = inquirer.constructor.name;
    }
  }

  @Injectable()
  class RegularService {
    constructor(
      public transient: TransientService,
      @Inject(SOME_TOKEN) public token: string,
    ) {}
  }

  @Injectable()
  class DynamicService {
    constructor(
      public regular: RegularService,
      public transient: TransientService,
    ) {}
  }

  describe('creating an instance with moduleRef.create', () => {
    let service: DynamicService;
    let moduleRef: ModuleRef;

    beforeEach(async () => {
      const module = await Test.createTestingModule({
        providers: [
          RegularService,
          TransientService,
          DynamicService,
          { provide: SOME_TOKEN, useValue: 'some-value' },
        ],
      }).compile();

      moduleRef = module.get(ModuleRef);
      service = await moduleRef.create(DynamicService);
    });

    it('should be able to inject a regular dependency', async () => {
      expect(service.regular.token).to.equal('some-value');
      expect(service.regular.transient.context).to.equal(RegularService.name);
    });

    it('should be able to inject a transient-scoped dependency', async () => {
      expect(service.transient.token).to.equal('some-value');
      expect(service.transient.context).to.equal(DynamicService.name);
    });

    it('should work correctly when there is another class that injects the same dependency', async () => {
      @Injectable()
      class AnotherDynamicService {
        constructor(
          public regular: RegularService,
          public transient: TransientService,
        ) {}
      }

      const service2 = await moduleRef.create(AnotherDynamicService);

      expect(service2.regular.token).to.equal('some-value');
      expect(service2.regular.transient.context).to.equal(RegularService.name);

      expect(service2.transient.token).to.equal('some-value');
      expect(service2.transient.context).to.equal(AnotherDynamicService.name);
    });
  });
});
