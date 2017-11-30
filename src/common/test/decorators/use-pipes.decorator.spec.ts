import 'reflect-metadata';
import { expect } from 'chai';
import { UsePipes } from '../../decorators/core/use-pipes.decorator';
import { PIPES_METADATA } from '../../constants';

describe('@UsePipes', () => {
    const pipes = [ 'pipe1', 'pipe2' ];

    @UsePipes(...pipes as any) class Test {}

    class TestWithMethod {
        @UsePipes(...pipes as any)
        public static test() {}
    }

    it('should enhance class with expected pipes array', () => {
        const metadata = Reflect.getMetadata(PIPES_METADATA, Test);
        expect(metadata).to.be.eql(pipes);
    });

    it('should enhance method with expected pipes array', () => {
        const metadata = Reflect.getMetadata(PIPES_METADATA, TestWithMethod.test);
        expect(metadata).to.be.eql(pipes);
    });

});