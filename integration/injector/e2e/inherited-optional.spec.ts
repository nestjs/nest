import { Injectable, mixin, Module, Optional } from '@nestjs/common';
import { UnknownDependenciesException } from '@nestjs/core/errors/exceptions/unknown-dependencies.exception.js';
import { Test } from '@nestjs/testing';

@Injectable()
class NeededService {
  exec() {
    return 'exec';
  }
}

@Module({
  providers: [NeededService],
  exports: [NeededService],
})
class NeededModule {}

class FooOptions {}

const Foo = () => {
  class FooMixin {
    constructor(@Optional() readonly options?: FooOptions) {}
  }
  return mixin(FooMixin);
};

@Injectable()
class FooService extends Foo() {
  constructor(private readonly neededService: NeededService) {
    super();
  }

  doSomething() {
    return this.neededService.exec();
  }
}

@Module({
  imports: [],
  providers: [FooService],
  exports: [FooService],
})
class FooModule {}

@Injectable()
class InheritedFooService extends Foo() {}

describe('Inherited optional dependency', () => {
  /**
   * You can see details on this issue here: https://github.com/nestjs/nest/issues/2581
   */
  describe('when the parent has an @Optional() parameter', () => {
    it('should throw an UnknownDependenciesException due to the missing dependency', async () => {
      const module = Test.createTestingModule({
        imports: [NeededModule, FooModule],
      });

      await expect(module.compile()).rejects.toBeInstanceOf(
        UnknownDependenciesException,
      );
    });

    it('should treat the parameter as optional when the child does not redeclare the constructor', async () => {
      const module = await Test.createTestingModule({
        providers: [InheritedFooService],
      }).compile();

      const service = module.get(InheritedFooService);
      expect(service).toBeInstanceOf(InheritedFooService);
      expect(service.options).toBeUndefined();
    });

    it('should inject the dependency when the child does not redeclare the constructor and it is available', async () => {
      const module = await Test.createTestingModule({
        providers: [InheritedFooService, FooOptions],
      }).compile();

      expect(module.get(InheritedFooService).options).toBeInstanceOf(
        FooOptions,
      );
    });
  });
});
