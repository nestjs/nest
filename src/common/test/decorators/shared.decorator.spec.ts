import 'reflect-metadata';
import { expect } from 'chai';
import { Shared } from '../../decorators/modules/shared.decorator';
import { SHARED_MODULE_METADATA } from '../../constants';

describe('Shared', () => {
    let type;
    const token = '_';
    class Test {}

    beforeEach(() => {
        type = Shared(token)(Test);
    });
    it('should enrich metatype with SharedModule token', () => {
        const opaqueToken = Reflect.getMetadata(SHARED_MODULE_METADATA, type);
        expect(opaqueToken).to.be.equal(token);
    });
    it('should set name of the metatype', () => {
        expect(type.name).to.eq(Test.name);
    });
});