import 'reflect-metadata';
import { expect } from 'chai';
import { UseInterceptors } from '../../utils/decorators/use-interceptors.decorator';
import { INTERCEPTORS_METADATA } from './../../constants';

describe('@UseInterceptors', () => {
    const interceptors = [ 'interceptor1', 'interceptor2' ];

    @UseInterceptors(...interceptors as any) class Test {}

    class TestWithMethod {
        @UseInterceptors(...interceptors as any)
        public static test() {}
    }

    it('should enhance class with expected interceptors array', () => {
        const metadata = Reflect.getMetadata(INTERCEPTORS_METADATA, Test);
        expect(metadata).to.be.eql(interceptors);
    });

    it('should enhance method with expected interceptors array', () => {
        const metadata = Reflect.getMetadata(INTERCEPTORS_METADATA, TestWithMethod.test);
        expect(metadata).to.be.eql(interceptors);
    });

});