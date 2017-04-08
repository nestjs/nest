import 'reflect-metadata';
import { expect } from 'chai';
import { ProvideValues } from '../../utils/provide-values.util';

describe('ProvideValues', () => {
    let type, data = { test: [ 1, 2, 3 ] };
    class Test {}

    beforeEach(() => {
        type = ProvideValues(data)(Test);
    });
    it('should enrich prototype with given values', () => {
        expect(type.prototype).to.contain(data);
    });
    it('should set name of metatype', () => {
        expect(type.name).to.eq(Test.name + JSON.stringify(data));
    });
});