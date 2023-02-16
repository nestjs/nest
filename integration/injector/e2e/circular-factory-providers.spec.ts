import { Test } from '@nestjs/testing';
import { Assertion, expect } from 'chai';
import {
  CircularFactoryProvidersModule,
  NonCircularFactoryProvidersModule,
} from '../src/circular-factory-provider/circular.module';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { CircularDependencyFactoryProviderException } from '@nestjs/core/errors/exceptions/circular-dependency-factory-provider.exception';

chai.use(chaiAsPromised);

describe('Circular Factory Provider Dependency', () => {
  it('should log an Error when a Circular Dependency between Factory Providers is detected', async () => {
    const builder = Test.createTestingModule({
      imports: [CircularFactoryProvidersModule],
    });

    // Assert that the Error is thrown

    await expect(
      builder.compile(),
    ).to.eventually.be.rejected.and.be.an.instanceOf(
      CircularDependencyFactoryProviderException,
    );
  });

  it('should log no Error when no Circular Dependency between Factory Providers is detected', async () => {
    const builder = Test.createTestingModule({
      imports: [NonCircularFactoryProvidersModule],
    });

    // Assert that the Error is thrown

    await expect(builder.compile()).to.eventually.be.fulfilled;
  });
});
