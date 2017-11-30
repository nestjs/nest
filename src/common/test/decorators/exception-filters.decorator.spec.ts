import 'reflect-metadata';
import { expect } from 'chai';
import { EXCEPTION_FILTERS_METADATA } from '../../constants';
import { UseFilters } from '../../decorators/core/exception-filters.decorator';

describe('@UseFilters', () => {
    const filters = [ 'exception', 'exception2' ];

    @UseFilters(...filters as any) class Test {}

    class TestWithMethod {
        @UseFilters(...filters as any)
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