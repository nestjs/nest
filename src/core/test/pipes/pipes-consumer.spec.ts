import * as sinon from 'sinon';
import { expect } from 'chai';
import { PipesConsumer } from './../../pipes/pipes-consumer';
import { RouteParamtypes } from './../../../common/enums/route-paramtypes.enum';

describe('PipesConsumer', () => {
    let consumer: PipesConsumer;
    beforeEach(() => {
        consumer = new PipesConsumer();
    });
    describe('apply', () => {
        let value, metatype, type, stringifiedType, transforms;
        beforeEach(() => {
            value = 0;
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
            consumer.apply(value, metatype, type, transforms).then(() => {
                expect(transforms.reduce((prev, next) => prev && next.called, true)).to.be.true;
                done();
            });
        });
        it('should returns expected result', (done) => {
            const expectedResult = 3;
            consumer.apply(value, metatype, type, transforms).then((result) => {
                expect(result).to.be.eql(expectedResult);
                done();
            });
        });
    });
});