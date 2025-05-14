import { Injectable, mixin, Module, Optional } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { expect } from 'chai';
import { UnknownDependenciesException } from '@nestjs/core/errors/exceptions/unknown-dependencies.exception';

chai.use(chaiAsPromised);

describe('Inherited optional dependency', () => {
  const Foo = () => {
    class FooMixin {
      constructor(@Optional() option: any) {}
    }
    return mixin(FooMixin);
  };

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
  class SomeModule {}

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

  /**
   * You can see details on this issue here: https://github.com/nestjs/nest/issues/2581
   */
  it('should remove optional dependency metadata inherited from base class', async () => {
    const module = Test.createTestingModule({
      imports: [SomeModule, FooModule],
    });

    await expect(
      module.compile(),
    ).to.eventually.be.rejected.and.be.an.instanceOf(
      UnknownDependenciesException,
    );
  });
});
