import 'reflect-metadata';
import { expect } from 'chai';
import { EXCEPTION_FILTERS_METADATA } from '../../constants';
import { ExceptionFilters } from '../../utils/decorators/exception-filters.decorator';

describe('@ExceptionFilters', () => {
    const filters = [ 'exception', 'exception2' ];

    @ExceptionFilters(...filters as any) class Test {}

    class TestWithMethod {
        @ExceptionFilters(...filters as any)
        public static test() {}
    }

    it('should enhance class with expected exception filters array', () => {
        const metadata = Reflect.getMetadata(EXCEPTION_FILTERS_METADATA, Test);
        expect(metadata).to.be.eql(filters);
    });

    it('should enhance method with expected exception filters array', () => {
        const metadata = Reflect.getMetadata(EXCEPTION_FILTERS_METADATA, TestWithMethod.test);
        expect(metadata).to.be.eql(filters);
    });

});