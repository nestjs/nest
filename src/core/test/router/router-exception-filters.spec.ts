import * as sinon from 'sinon';
import { expect } from 'chai';
import { RouterExceptionFilters } from '../../router/router-exception-filters';
import { UseFilters } from '../../../common/utils/decorators/exception-filters.decorator';
import { Catch } from '../../../common/utils/decorators/catch.decorator';
import { UnknownModuleException } from '../../errors/exceptions/unknown-module.exception';
import { ApplicationConfig } from '../../application-config';

describe('RouterExceptionFilters', () => {
    let moduleName: string;
    let exceptionFilter: RouterExceptionFilters;

    class CustomException {}
    @Catch(CustomException)
    class ExceptionFilter {
        public catch(exc, res) {}
    }

    beforeEach(() => {
        moduleName = 'Test';
        exceptionFilter = new RouterExceptionFilters(new ApplicationConfig());
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
            @UseFilters(new ExceptionFilter())
            class WithMetadata {}

            it('should returns ExceptionHandler object with exception filters', () => {
                const filter = exceptionFilter.create(new WithMetadata(), () => ({}) as any);
                expect((filter as any).filters).to.not.be.empty;
            });
        });
    });
    describe('reflectCatchExceptions', () => {
        it('should returns FILTER_CATCH_EXCEPTIONS metadata', () => {
            expect(
                exceptionFilter.reflectCatchExceptions(new ExceptionFilter()),
            ).to.be.eql([ CustomException ]);
        });
    });
    describe('createConcreteContext', () => {
        class InvalidFilter {}
        const filters = [ new ExceptionFilter(), new InvalidFilter(), 'test' ];

        beforeEach(() => {
            sinon.stub(exceptionFilter, 'findExceptionsFilterInstance').onFirstCall().returns({
                catch: () => ({}),
            }).onSecondCall().returns({});
        });
        it('should returns expected exception filters metadata', () => {
            const resolved = exceptionFilter.createConcreteContext(filters as any);
            expect(resolved).to.have.length(1);
            expect(resolved[0].exceptionMetatypes).to.be.deep.equal([ CustomException ]);
            expect(resolved[0].func).to.be.a('function');
        });
    });
});