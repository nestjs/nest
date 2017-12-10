import 'reflect-metadata';

import { Inject } from '../../index';
import { SELF_DECLARED_DEPS_METADATA } from '../../constants';
import { expect } from 'chai';

describe('@Inject', () => {
    const opaqueToken = () => ({});
    class Test {
        constructor(
            @Inject('test') param: any,
            @Inject('test2') param2: any,
            @Inject(opaqueToken) param3: any) { }
    }

    it('should enhance class with expected constructor params metadata', () => {
        const metadata = Reflect.getMetadata(SELF_DECLARED_DEPS_METADATA, Test);

        const expectedMetadata = [
            { index: 2, param: opaqueToken.name },
            { index: 1, param: 'test2' },
            { index: 0, param: 'test' },
        ];
        expect(metadata).to.be.eql(expectedMetadata);
    });

});
