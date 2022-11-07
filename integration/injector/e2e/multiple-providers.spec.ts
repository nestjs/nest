import { Test } from '@nestjs/testing';
import { expect } from 'chai';
import { MultipleProvidersModule } from '../src/multiple-providers/multiple-providers.module';

describe('Multiple providers under the same token ("each" feature)', () => {
  describe('get()', () => {
    it('should return an array of providers', async () => {
      const builder = Test.createTestingModule({
        imports: [MultipleProvidersModule],
      });
      const testingModule = await builder.compile();

      const multiProviderInstances = testingModule.get<string>(
        'MULTI_PROVIDER',
        {
          each: true,
        },
      );

      // @ts-expect-error: make sure "multiProviderInstances" is string[] not string
      multiProviderInstances.charAt;

      expect(multiProviderInstances).to.be.eql(['A', 'B', 'C']);
    });
  });
  describe('resolve()', () => {
    it('should return an array of providers', async () => {
      const builder = Test.createTestingModule({
        imports: [MultipleProvidersModule],
      });
      const testingModule = await builder.compile();

      const multiProviderInstances = await testingModule.resolve<string>(
        'REQ_SCOPED_MULTI_PROVIDER',
        undefined,
        {
          each: true,
        },
      );

      // @ts-expect-error: make sure "multiProviderInstances" is string[] not string
      multiProviderInstances.charAt;

      expect(multiProviderInstances).to.be.eql(['A', 'B', 'C']);
    });
  });
});
