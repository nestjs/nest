import 'reflect-metadata';
import { expect } from 'chai';
import { Dependencies } from '../../utils/dependencies.decorator';
import { PARAMTYPES_METADATA } from '../../constants';

describe('@Dependencies', () => {
    const deps = [ 'test', 'test2' ];

    @Dependencies(deps) class Test {}

    it('should enhance class with expected dependencies array', () => {
        const metadata = Reflect.getMetadata(PARAMTYPES_METADATA, Test);
        expect(metadata).to.be.eql(deps);
    });

});