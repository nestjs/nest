import { expect } from 'chai';
import * as sinon from 'sinon';
import { Catch } from '../../../core/utils/decorators/catch.decorator';
import { ExceptionFilters } from '../../../core/utils/decorators/exception-filters.decorator';
import { ExceptionFiltersContext } from './../../context/exception-filters-context';

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
        exceptionFilter = new ExceptionFiltersContext();
    });
    describe('create', () => {
        describe('when filters metadata is empty', () => {
            class EmptyMetadata {}
            beforeEach(() => {
                sinon.stub(exceptionFilter, 'createContext').returns([]);
            });
            it('should returns plain ExceptionHandler object', () => {
                const filter = exceptionFilter.create(new EmptyMetadata(), () => ({}) as any);
                expect((filter as any).filters).to.be.empty;
            });
        });
        describe('when filters metadata is not empty', () => {
            @ExceptionFilters(new ExceptionFilter())
            class WithMetadata {}

            it('should returns ExceptionHandler object with exception filters', () => {
                const filter = exceptionFilter.create(new WithMetadata(), () => ({}) as any);
                expect((filter as any).filters).to.not.be.empty;
            });
        });
    });
});
