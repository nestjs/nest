import 'reflect-metadata';
import { expect } from 'chai';
import { Inject } from '../../utils/inject.decorator';
import { PARAMTYPES_METADATA } from '../../constants';

describe('@Inject', () => {
    const deps = [ 'test', 'test2' ];

    @Inject(deps) class Test {}

    it('should enhance class with expected dependencies array', () => {
        const metadata = Reflect.getMetadata(PARAMTYPES_METADATA, Test);
        expect(metadata).to.be.eql(deps);
    });

});