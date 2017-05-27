import * as sinon from 'sinon';
import { expect } from 'chai';
import { RouterExceptionFilters } from '../../router/router-exception-filters';
import { ExceptionFilters } from '../../../common/utils/decorators/exception-filters.decorator';
import { Catch } from '../../../common/utils/decorators/catch.decorator';
import { UnknownModuleException } from '../../errors/exceptions/unknown-module.exception';

describe('RouterExceptionFilters', () => {
    let moduleName: string;
    let exceptionFilter: RouterExceptionFilters;
    let container: { getModules: sinon.SinonStub };

    class CustomException {}
    @Catch(CustomException)
    class ExceptionFilter {
        public catch(exc, res) {}
    }

    beforeEach(() => {
        container = {
            getModules: sinon.stub(),
        };
        moduleName = 'Test';
        exceptionFilter = new RouterExceptionFilters(container as any);
    });
    describe('create', () => {
        describe('when filters metadata is empty', () => {
            class EmptyMetadata {}
            it('should returns plain ExceptionHandler object', () => {
                const filter = exceptionFilter.create(new EmptyMetadata(), moduleName);
                expect((filter as any).filters).to.be.empty;
            });
        });
        describe('when filters metadata is not empty', () => {
            @ExceptionFilters(ExceptionFilter)
            class WithMetadata {}
            beforeEach(() => {
                sinon.stub(exceptionFilter, 'findExceptionsFilterInstance').returns({
                    catch: () => ({}),
                });
            });
            it('should returns ExceptionHandler object with exception filters', () => {
                const filter = exceptionFilter.create(new WithMetadata(), moduleName);
                expect((filter as any).filters).to.not.be.empty;
            });
        });
    });
    describe('reflectExceptionFilters', () => {
        const filters = [ ExceptionFilter ];
        @ExceptionFilters(...filters)
        class WithMetadata {}
        it('should returns EXCEPTION_FILTERS_METADATA metadata', () => {
            expect(
                exceptionFilter.reflectExceptionFilters(new WithMetadata()),
            ).to.be.eql(filters);
        });
    });
    describe('findExceptionsFilterInstance', () => {
        beforeEach(() => {
            container.getModules.returns({
                has: (arg) => false,
            });
        });
        it('should throws "UnknownModuleException" when module does not exists', () => {
            expect(
                () => exceptionFilter.findExceptionsFilterInstance(null, 'test'),
            ).to.throws(UnknownModuleException);
        });
    });
    describe('reflectCatchExceptions', () => {
        it('should returns FILTER_CATCH_EXCEPTIONS metadata', () => {
            expect(
                exceptionFilter.reflectCatchExceptions(ExceptionFilter),
            ).to.be.eql([ CustomException ]);
        });
    });
    describe('resolveFiltersMetatypes', () => {
        class InvalidFilter {}
        const filters = [ ExceptionFilter, InvalidFilter, 'test' ];

        beforeEach(() => {
            sinon.stub(exceptionFilter, 'findExceptionsFilterInstance').onFirstCall().returns({
                catch: () => ({}),
            }).onSecondCall().returns({});
        });
        it('should returns expected exception filters metadata', () => {
            const resolved = exceptionFilter.resolveFiltersMetatypes(filters as any, moduleName);
            expect(resolved).to.have.length(1);
            expect(resolved[0].exceptionMetatypes).to.be.deep.equal([ CustomException ]);
            expect(resolved[0].func).to.be.a('function');
        });
    });
});