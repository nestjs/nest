import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { MultiProviderUseValueModule } from '../src/multi-provider/multi-provider-use-value.module';
import { MultiProviderUseFactoryModule } from '../src/multi-provider/multi-provider-use-factory.module';
import { MultiProviderUseClassModule } from '../src/multi-provider/multi-provider-use-class.module';
import { MultiProviderMixedModule } from '../src/multi-provider/multi-provider-mixed.module';
import { MixedMultiProviderException } from '@nestjs/core/errors/exceptions/mixed-multi-provider.exception';

describe('MultiProvider', () => {
  it(`should return an array of values when using the "multi" option and "useValue"`, async () => {
    const builder = Test.createTestingModule({
      imports: [MultiProviderUseValueModule],
    });
    const app = await builder.compile();
    expect(app.get('TEST')).to.deep.eq(['a', 'b']);
  });

  it(`should return an array of values when using the "multi" option and "useFactory"`, async () => {
    const builder = Test.createTestingModule({
      imports: [MultiProviderUseFactoryModule],
    });
    const app = await builder.compile();
    expect(app.get('TEST')).to.deep.eq(['a', 'b']);
  });

  it(`should return an array of values when using the "multi" option and "useClass"`, async () => {
    const builder = Test.createTestingModule({
      imports: [MultiProviderUseClassModule],
    });
    const app = await builder.compile();
    expect(app.get('TEST')[0].test()).to.deep.eq('a');
    expect(app.get('TEST')[1].test()).to.deep.eq('b');
  });

  it(`should throw an error if "mutli" value is mixed with the same token`, async () => {
    try {
      const builder = Test.createTestingModule({
        imports: [MultiProviderMixedModule],
      });
      await builder.compile();
    } catch (err) {
      expect(err).to.be.instanceof(MixedMultiProviderException);
    }
  });
});
