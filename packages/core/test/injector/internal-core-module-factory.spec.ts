import { expect } from 'chai';
import { NestContainer } from '../../injector/container';
import { InternalCoreModule } from '../../injector/internal-core-module';
import { InternalCoreModuleFactory } from '../../injector/internal-core-module-factory';

describe('InternalCoreModuleFactory', () => {
  it('should return the interal core module definition', () => {
    expect(
      InternalCoreModuleFactory.create(new NestContainer(), null, null, null)
        .module,
    ).to.equal(InternalCoreModule);
  });
});
