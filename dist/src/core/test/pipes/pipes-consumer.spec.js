"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const pipes_consumer_1 = require("./../../pipes/pipes-consumer");
const route_paramtypes_enum_1 = require("./../../../common/enums/route-paramtypes.enum");
describe('PipesConsumer', () => {
    let consumer;
    beforeEach(() => {
        consumer = new pipes_consumer_1.PipesConsumer();
    });
    describe('apply', () => {
        let value, metatype, type, stringifiedType, transforms, data;
        beforeEach(() => {
            value = 0;
            data = null;
            metatype = {},
                type = route_paramtypes_enum_1.RouteParamtypes.QUERY;
            stringifiedType = 'query';
            transforms = [
                sinon.stub().callsFake((val) => val + 1),
                sinon.stub().callsFake((val) => Promise.resolve(val + 1)),
                sinon.stub().callsFake((val) => val + 1),
            ];
        });
        it('should call all transform functions', (done) => {
            consumer.apply(value, { metatype, type, data }, transforms).then(() => {
                chai_1.expect(transforms.reduce((prev, next) => prev && next.called, true)).to.be.true;
                done();
            });
        });
        it('should returns expected result', (done) => {
            const expectedResult = 3;
            consumer.apply(value, { metatype, type, data }, transforms).then((result) => {
                chai_1.expect(result).to.be.eql(expectedResult);
                done();
            });
        });
    });
});
//# sourceMappingURL=pipes-consumer.spec.js.map