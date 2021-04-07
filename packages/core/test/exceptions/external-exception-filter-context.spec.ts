import { expect } from 'chai';
import * as sinon from 'sinon';

import { Catch } from '../../../common/decorators/core/catch.decorator';
import { UseFilters } from '../../../common/decorators/core/exception-filters.decorator';
import { ApplicationConfig } from '../../application-config';
import { ExternalExceptionFilterContext } from '../../exceptions/external-exception-filter-context';
import { NestContainer } from '../../injector/container';
import { InstanceWrapper } from '../../injector/instance-wrapper';

describe('ExternalExceptionFilterContext', () => {
  let applicationConfig: ApplicationConfig;
  let exceptionFilter: ExternalExceptionFilterContext;

  class CustomException {}
  @Catch(CustomException)
  class ExceptionFilter {
    public catch(exc, res) {}
  }

  beforeEach(() => {
    applicationConfig = new ApplicationConfig();
    exceptionFilter = new ExternalExceptionFilterContext(
      new NestContainer(),
      applicationConfig,
    );
  });
  describe('create', () => {
    describe('when filters metadata is empty', () => {
      class EmptyMetadata {}
      beforeEach(() => {
        sinon.stub(exceptionFilter, 'createContext').returns([]);
      });
      it('should returns plain ExceptionHandler object', () => {
        const filter = exceptionFilter.create(
          new EmptyMetadata(),
          () => ({} as any),
          undefined,
        );
        expect((filter as any).filters).to.be.empty;
      });
    });
    describe('when filters metadata is not empty', () => {
      @UseFilters(new ExceptionFilter())
      class WithMetadata {}

      it('should returns ExceptionHandler object with exception filters', () => {
        const filter = exceptionFilter.create(
          new WithMetadata(),
          () => ({} as any),
          undefined,
        );
        expect((filter as any).filters).to.not.be.empty;
      });
    });
  });
  describe('reflectCatchExceptions', () => {
    it('should returns FILTER_CATCH_EXCEPTIONS metadata', () => {
      expect(
        exceptionFilter.reflectCatchExceptions(new ExceptionFilter()),
      ).to.be.eql([CustomException]);
    });
  });
  describe('createConcreteContext', () => {
    class InvalidFilter {}
    const filters = [new ExceptionFilter(), new InvalidFilter(), 'test'];

    it('should returns expected exception filters metadata', () => {
      const resolved = exceptionFilter.createConcreteContext(filters as any);
      expect(resolved).to.have.length(1);
      expect(resolved[0].exceptionMetatypes).to.be.deep.equal([
        CustomException,
      ]);
      expect(resolved[0].func).to.be.a('function');
    });
  });

  describe('getGlobalMetadata', () => {
    describe('when contextId is static and inquirerId is nil', () => {
      it('should return global filters', () => {
        const expectedResult = applicationConfig.getGlobalFilters();
        expect(exceptionFilter.getGlobalMetadata()).to.be.equal(expectedResult);
      });
    });
    describe('otherwise', () => {
      it('should merge static global with request/transient scoped filters', () => {
        const globalFilters: any = ['test'];
        const instanceWrapper = new InstanceWrapper();
        const instance = 'request-scoped';
        const scopedFilterWrappers = [instanceWrapper];

        sinon
          .stub(applicationConfig, 'getGlobalFilters')
          .callsFake(() => globalFilters);
        sinon
          .stub(applicationConfig, 'getGlobalRequestFilters')
          .callsFake(() => scopedFilterWrappers);
        sinon
          .stub(instanceWrapper, 'getInstanceByContextId')
          .callsFake(() => ({ instance } as any));

        expect(exceptionFilter.getGlobalMetadata({ id: 3 })).to.contains(
          instance,
          ...globalFilters,
        );
      });
    });
  });
});
