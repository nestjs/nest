import 'reflect-metadata';
import { expect } from 'chai';
import { Catch } from '../../decorators/core/catch.decorator';
import { FILTER_CATCH_EXCEPTIONS } from '../../constants';

describe('@Catch', () => {
    const exceptions = [ 'exception', 'exception2' ];

    @Catch(...exceptions) class Test {}

    it('should enhance class with expected exceptions array', () => {
        const metadata = Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS, Test);
        expect(metadata).to.be.eql(exceptions);
    });

});