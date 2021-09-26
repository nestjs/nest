import { expect } from 'chai';
import * as sinon from 'sinon';
import { Catch } from '../../../common/decorators/core/catch.decorator';
import { UseFilters } from '../../../common/decorators/core/exception-filters.decorator';
import { NestContainer } from '../../../core/injector/container';
import { ExceptionFiltersContext } from '../../context/exception-filters-context';

describe('ExceptionFiltersContext', () => {
  let moduleName: string;
  let exceptionFilter: ExceptionFiltersContext;

  class CustomException {}
  @Catch(CustomException)
  class ExceptionFilter {
    public catch(exc, res) {}
  }

  beforeEach(() => {
    moduleName = 'Test';
    exceptionFilter = new ExceptionFiltersContext(new NestContainer() as any);
  });
  describe('create', () => {
    describe('when filters metadata is empty', () => {
      class EmptyMetadata {}
      beforeEach(() => {
        sinon.stub(exceptionFilter, 'createContext').returns([]);
      });
      it('should return plain ExceptionHandler object', () => {
        const filter = exceptionFilter.create(
          new EmptyMetadata(),
          () => ({} as any),
          '',
        );
        expect((filter as any).filters).to.be.empty;
      });
    });
    describe('when filters metadata is not empty', () => {
      @UseFilters(new ExceptionFilter())
      class WithMetadata {}

      it('should return ExceptionHandler object with exception filters', () => {
        const filter = exceptionFilter.create(
          new WithMetadata(),
          () => ({} as any),
          '',
        );
        expect((filter as any).filters).to.not.be.empty;
      });
    });
  });
});
