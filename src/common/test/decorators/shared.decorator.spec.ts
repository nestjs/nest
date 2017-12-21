import 'reflect-metadata';

import { SHARED_MODULE_METADATA } from '../../constants';
import { Shared } from '../../decorators/modules/shared.decorator';
import { expect } from 'chai';

describe('Shared', () => {
    let type: any;
    const token = '_';
    class Test { }

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
