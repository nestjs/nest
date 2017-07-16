"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const route_paramtypes_enum_1 = require("../../../common/enums/route-paramtypes.enum");
const route_params_factory_1 = require("../../router/route-params-factory");
describe('RouteParamsFactory', () => {
    let factory;
    beforeEach(() => {
        factory = new route_params_factory_1.RouteParamsFactory();
    });
    describe('exchangeKeyForValue', () => {
        const res = {};
        const next = () => ({});
        const req = {
            session: null,
            body: {
                foo: 'bar',
            },
            headers: {
                foo: 'bar',
            },
            params: {
                foo: 'bar',
            },
            query: {
                foo: 'bar',
            },
        };
        describe('when key is', () => {
            const args = [null, { res, req, next }];
            describe(`RouteParamtypes.NEXT`, () => {
                it('should returns next object', () => {
                    chai_1.expect(factory.exchangeKeyForValue(route_paramtypes_enum_1.RouteParamtypes.NEXT, ...args)).to.be.eql(next);
                });
            });
            describe(`RouteParamtypes.RESPONSE`, () => {
                it('should returns response object', () => {
                    chai_1.expect(factory.exchangeKeyForValue(route_paramtypes_enum_1.RouteParamtypes.RESPONSE, ...args)).to.be.eql(res);
                });
            });
            describe(`RouteParamtypes.REQUEST`, () => {
                it('should returns request object', () => {
                    chai_1.expect(factory.exchangeKeyForValue(route_paramtypes_enum_1.RouteParamtypes.REQUEST, ...args)).to.be.eql(req);
                });
            });
            describe(`RouteParamtypes.BODY`, () => {
                it('should returns body object', () => {
                    chai_1.expect(factory.exchangeKeyForValue(route_paramtypes_enum_1.RouteParamtypes.BODY, ...args)).to.be.eql(req.body);
                });
            });
            describe(`RouteParamtypes.HEADERS`, () => {
                it('should returns headers object', () => {
                    chai_1.expect(factory.exchangeKeyForValue(route_paramtypes_enum_1.RouteParamtypes.HEADERS, ...args)).to.be.eql(req.headers);
                });
            });
            describe(`RouteParamtypes.SESSION`, () => {
                it('should returns session object', () => {
                    chai_1.expect(factory.exchangeKeyForValue(route_paramtypes_enum_1.RouteParamtypes.SESSION, ...args)).to.be.eql(req.session);
                });
            });
            describe(`RouteParamtypes.QUERY`, () => {
                it('should returns query object', () => {
                    chai_1.expect(factory.exchangeKeyForValue(route_paramtypes_enum_1.RouteParamtypes.QUERY, ...args)).to.be.eql(req.query);
                });
            });
            describe(`RouteParamtypes.PARAM`, () => {
                it('should returns params object', () => {
                    chai_1.expect(factory.exchangeKeyForValue(route_paramtypes_enum_1.RouteParamtypes.PARAM, ...args)).to.be.eql(req.params);
                });
            });
            describe('not available', () => {
                it('should returns null', () => {
                    chai_1.expect(factory.exchangeKeyForValue(-1, ...args)).to.be.eql(null);
                });
            });
        });
    });
});
//# sourceMappingURL=route-params-factory.spec.js.map