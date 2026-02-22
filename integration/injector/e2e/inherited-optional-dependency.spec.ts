import { Injectable, mixin, Module, Optional } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { UnknownDependenciesException } from '@nestjs/core/errors/exceptions/unknown-dependencies.exception';
import { expect } from 'chai';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
chai.use(chaiAsPromised);

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

const Foo = () => {
  class FooMixin {
    constructor(@Optional() option: any) {}
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

describe('Inherited optional dependency', () => {
  /**
   * You can see details on this issue here: https://github.com/nestjs/nest/issues/2581
   */
  describe('when the parent has an @Optional() parameter', () => {
    it('should throw an UnknownDependenciesException due to the missing dependency', async () => {
      const module = Test.createTestingModule({
        imports: [NeededModule, FooModule],
      });

      await expect(
        module.compile(),
      ).to.eventually.be.rejected.and.be.an.instanceOf(
        UnknownDependenciesException,
      );
    });
  });
});
