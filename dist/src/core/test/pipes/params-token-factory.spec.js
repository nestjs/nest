"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const params_token_factory_1 = require("./../../pipes/params-token-factory");
const route_paramtypes_enum_1 = require("../../../common/enums/route-paramtypes.enum");
describe('ParamsTokenFactory', () => {
    let factory;
    beforeEach(() => {
        factory = new params_token_factory_1.ParamsTokenFactory();
    });
    describe('exchangeEnumForString', () => {
        describe('when key is', () => {
            describe(`RouteParamtypes.BODY`, () => {
                it('should returns body object', () => {
                    chai_1.expect(factory.exchangeEnumForString(route_paramtypes_enum_1.RouteParamtypes.BODY)).to.be.eql('body');
                });
            });
            describe(`RouteParamtypes.QUERY`, () => {
                it('should returns query object', () => {
                    chai_1.expect(factory.exchangeEnumForString(route_paramtypes_enum_1.RouteParamtypes.QUERY)).to.be.eql('query');
                });
            });
            describe(`RouteParamtypes.PARAM`, () => {
                it('should returns params object', () => {
                    chai_1.expect(factory.exchangeEnumForString(route_paramtypes_enum_1.RouteParamtypes.PARAM)).to.be.eql('param');
                });
            });
            describe('not available', () => {
                it('should returns null', () => {
                    chai_1.expect(factory.exchangeEnumForString(-1)).to.be.eql(null);
                });
            });
        });
    });
});
//# sourceMappingURL=params-token-factory.spec.js.map