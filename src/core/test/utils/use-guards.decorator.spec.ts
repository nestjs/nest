import 'reflect-metadata';
import { expect } from 'chai';
import { UseGuards } from '../../utils/decorators/use-guards.decorator';
import { GUARDS_METADATA } from './../../constants';

describe('@UseGuards', () => {
    const guards = [ 'guard1', 'guard2' ];

    @UseGuards(...guards as any) class Test {}

    class TestWithMethod {
        @UseGuards(...guards as any)
        public static test() {}
    }

    it('should enhance class with expected guards array', () => {
        const metadata = Reflect.getMetadata(GUARDS_METADATA, Test);
        expect(metadata).to.be.eql(guards);
    });

    it('should enhance method with expected guards array', () => {
        const metadata = Reflect.getMetadata(GUARDS_METADATA, TestWithMethod.test);
        expect(metadata).to.be.eql(guards);
    });

});