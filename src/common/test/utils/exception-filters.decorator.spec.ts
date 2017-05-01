import 'reflect-metadata';
import { expect } from 'chai';
import { EXCEPTION_FILTERS_METADATA } from '../../constants';
import { ExceptionFilters } from '../../utils/decorators/exception-filters.decorator';

describe('@ExceptionFilters', () => {
    const filters = [ 'exception', 'exception2' ];

    @ExceptionFilters(...filters) class Test {}

    it('should enhance class with expected exception filters array', () => {
        const metadata = Reflect.getMetadata(EXCEPTION_FILTERS_METADATA, Test);
        expect(metadata).to.be.eql(filters);
    });

});