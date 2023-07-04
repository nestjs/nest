import { Test } from '@nestjs/testing';
import { Assertion, expect } from 'chai';
import {
  CircularFactoryProvidersModule,
  NonCircularFactoryProvidersModule,
} from '../src/circular-factory-providers/circular.module';
import * as chai from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { CircularDependencyFactoryProviderException } from '@nestjs/core/errors/exceptions/circular-dependency-factory-provider.exception';
import { Logger } from '@nestjs/common';

chai.use(chaiAsPromised);

describe('Circular Factory Provider Dependency', () => {
  it('should log an Error when a Circular Dependency between Factory Providers is detected', async () => {
    const builder = Test.createTestingModule({
      imports: [CircularFactoryProvidersModule],
    }).setLogger(new Logger());

    await expect(builder.compile())
      .to.eventually.be.rejected.and.be.an.instanceOf(
        CircularDependencyFactoryProviderException,
      )
      .and.property('message')
      .to.include('PROVIDER3 -> PROVIDER1 -> PROVIDER2 -> PROVIDER3');

    it('should log no Error when no Circular Dependency between Factory Providers is detected', async () => {
      const builder = Test.createTestingModule({
        imports: [NonCircularFactoryProvidersModule],
      });

      await expect(builder.compile()).to.eventually.be.fulfilled;
    });
  });
});
