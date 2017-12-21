import * as sinon from 'sinon';

import { PipesConsumer } from './../../pipes/pipes-consumer';
import { RouteParamtypes } from './../../../common/enums/route-paramtypes.enum';
import { expect } from 'chai';

describe('PipesConsumer', () => {
    let consumer: PipesConsumer;
    beforeEach(() => {
        consumer = new PipesConsumer();
    });
    describe('apply', () => {
        let value: any, metatype: any, type: any, stringifiedType: any, transforms: any, data: any;
        beforeEach(() => {
            value = 0;
            data = null;
            metatype = {},
                type = RouteParamtypes.QUERY;
            stringifiedType = 'query';
            transforms = [
                sinon.stub().callsFake((val) => val + 1),
                sinon.stub().callsFake((val) => Promise.resolve(val + 1)),
                sinon.stub().callsFake((val) => val + 1),
            ];
        });
        it('should call all transform functions', (done) => {
            consumer.apply(value, { metatype, type, data }, transforms).then(() => {
                expect(transforms.reduce((prev: any, next: any) => prev && next.called, true)).to.be.true;
                done();
            });
        });
        it('should returns expected result', (done) => {
            const expectedResult = 3;
            consumer.apply(value, { metatype, type, data }, transforms).then((result) => {
                expect(result).to.be.eql(expectedResult);
                done();
            });
        });
    });
});
