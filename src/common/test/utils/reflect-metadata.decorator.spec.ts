import 'reflect-metadata';
import { expect } from 'chai';
import { ReflectMetadata } from '../../utils/decorators/reflect-metadata.decorator';

describe('@ReflectMetadata', () => {
    const key = 'key', value = 'value';

    @ReflectMetadata(key, value) class Test {}

    class TestWithMethod {
        @ReflectMetadata(key, value)
        public static test() {}
    }

    it('should enhance class with expected metadata', () => {
        const metadata = Reflect.getMetadata(key, Test);
        expect(metadata).to.be.eql(value);
    });

    it('should enhance method with expected metadata', () => {
        const metadata = Reflect.getMetadata(key, TestWithMethod.test);
        expect(metadata).to.be.eql(value);
    });

});