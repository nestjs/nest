"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const sinon = require("sinon");
const chai_1 = require("chai");
const route_paramtypes_enum_1 = require("../../../common/enums/route-paramtypes.enum");
const router_execution_context_1 = require("../../router/router-execution-context");
const index_1 = require("../../../index");
const route_params_factory_1 = require("../../router/route-params-factory");
const pipes_context_creator_1 = require("../../pipes/pipes-context-creator");
const pipes_consumer_1 = require("../../pipes/pipes-consumer");
const application_config_1 = require("../../application-config");
describe('RouterExecutionContext', () => {
    let contextCreator;
    let callback;
    let applySpy;
    let bindSpy;
    let factory;
    let consumer;
    beforeEach(() => {
        callback = {
            bind: () => ({}),
            apply: () => ({}),
        };
        bindSpy = sinon.spy(callback, 'bind');
        applySpy = sinon.spy(callback, 'apply');
        factory = new route_params_factory_1.RouteParamsFactory();
        consumer = new pipes_consumer_1.PipesConsumer();
        contextCreator = new router_execution_context_1.RouterExecutionContext(factory, new pipes_context_creator_1.PipesContextCreator(new application_config_1.ApplicationConfig()), consumer);
    });
    describe('create', () => {
        describe('when callback metadata is undefined', () => {
            it('should only bind instance as an context', () => {
                const instance = {};
                contextCreator.create(instance, callback);
                chai_1.expect(bindSpy.calledWith(instance)).to.be.true;
            });
        });
        describe('when callback metadata is not undefined', () => {
            let metadata;
            beforeEach(() => {
                metadata = {
                    [route_paramtypes_enum_1.RouteParamtypes.NEXT]: { index: 0 },
                    [route_paramtypes_enum_1.RouteParamtypes.BODY]: {
                        index: 2,
                        data: 'test',
                    },
                };
                sinon.stub(contextCreator, 'reflectCallbackMetadata').returns(metadata);
                sinon.stub(contextCreator, 'reflectCallbackParamtypes').returns([]);
            });
            describe('returns proxy function', () => {
                let proxyContext;
                let instance;
                beforeEach(() => {
                    instance = { foo: 'bar' };
                    proxyContext = contextCreator.create(instance, callback);
                });
                it('should be a function', () => {
                    chai_1.expect(proxyContext).to.be.a('function');
                });
                describe('when proxy function called', () => {
                    let exchangeKeysForValuesSpy;
                    let request;
                    const response = {};
                    const next = {};
                    beforeEach(() => {
                        request = {
                            body: {
                                test: 3,
                            },
                        };
                        exchangeKeysForValuesSpy = sinon.spy(contextCreator, 'exchangeKeysForValues');
                    });
                    it('should call "exchangeKeysForValues" with expected arguments', (done) => {
                        proxyContext(request, response, next).then(() => {
                            const keys = Object.keys(metadata);
                            chai_1.expect(exchangeKeysForValuesSpy.called).to.be.true;
                            chai_1.expect(exchangeKeysForValuesSpy.calledWith(keys, metadata, { req: request, res: response, next })).to.be.true;
                            done();
                        });
                    });
                    it('should apply expected context and arguments to callback', (done) => {
                        proxyContext(request, response, next).then(() => {
                            const args = [next, null, request.body.test];
                            chai_1.expect(applySpy.called).to.be.true;
                            chai_1.expect(applySpy.calledWith(instance, args)).to.be.true;
                            done();
                        });
                    });
                });
            });
        });
    });
    describe('reflectCallbackMetadata', () => {
        class TestController {
            callback(req, body) { }
        }
        __decorate([
            __param(0, index_1.Request()), __param(1, index_1.Body()),
            __metadata("design:type", Function),
            __metadata("design:paramtypes", [Object, Object]),
            __metadata("design:returntype", void 0)
        ], TestController.prototype, "callback", null);
        it('should returns ROUTE_ARGS_METADATA callback metadata', () => {
            const instance = new TestController();
            const metadata = contextCreator.reflectCallbackMetadata(instance, instance.callback);
            const expectedMetadata = {
                [`${route_paramtypes_enum_1.RouteParamtypes.REQUEST}:0`]: {
                    index: 0,
                    data: undefined,
                    pipes: [],
                },
                [`${route_paramtypes_enum_1.RouteParamtypes.BODY}:1`]: {
                    index: 1,
                    data: undefined,
                    pipes: [],
                },
            };
            chai_1.expect(metadata).to.deep.equal(expectedMetadata);
        });
    });
    describe('getArgumentsLength', () => {
        it('should returns maximum index + 1 (length) placed in array', () => {
            const max = 4;
            const metadata = {
                [route_paramtypes_enum_1.RouteParamtypes.REQUEST]: { index: 0 },
                [route_paramtypes_enum_1.RouteParamtypes.BODY]: {
                    index: max,
                },
            };
            chai_1.expect(contextCreator.getArgumentsLength(Object.keys(metadata), metadata)).to.be.eq(max + 1);
        });
    });
    describe('createNullArray', () => {
        it('should create N size array filled with null', () => {
            const size = 3;
            chai_1.expect(contextCreator.createNullArray(size)).to.be.deep.eq([null, null, null]);
        });
    });
    describe('exchangeKeysForValues', () => {
        const res = { body: 'res' };
        const req = { body: { test: 'req' } };
        const next = () => { };
        it('should exchange arguments keys for appropriate values', () => {
            const metadata = {
                [route_paramtypes_enum_1.RouteParamtypes.REQUEST]: { index: 0, data: 'test', pipes: [] },
                [route_paramtypes_enum_1.RouteParamtypes.BODY]: {
                    index: 2,
                    data: 'test',
                    pipes: [],
                },
            };
            const keys = Object.keys(metadata);
            const values = contextCreator.exchangeKeysForValues(keys, metadata, { res, req, next });
            const expectedValues = [
                { index: 0, value: req, type: route_paramtypes_enum_1.RouteParamtypes.REQUEST, data: 'test', pipes: [] },
                { index: 2, value: req.body.test, type: route_paramtypes_enum_1.RouteParamtypes.BODY, data: 'test', pipes: [] },
            ];
            chai_1.expect(values).to.deep.equal(expectedValues);
        });
    });
    describe('getParamValue', () => {
        let consumerApplySpy;
        const value = 3, metatype = null, transforms = [];
        beforeEach(() => {
            consumerApplySpy = sinon.spy(consumer, 'apply');
        });
        describe('when paramtype is query, body or param', () => {
            it('should call "consumer.apply" with expected arguments', () => {
                contextCreator.getParamValue(value, { metatype, type: route_paramtypes_enum_1.RouteParamtypes.QUERY, data: null }, transforms);
                chai_1.expect(consumerApplySpy.calledWith(value, { metatype, type: route_paramtypes_enum_1.RouteParamtypes.QUERY, data: null }, transforms)).to.be.true;
                contextCreator.getParamValue(value, { metatype, type: route_paramtypes_enum_1.RouteParamtypes.BODY, data: null }, transforms);
                chai_1.expect(consumerApplySpy.calledWith(value, { metatype, type: route_paramtypes_enum_1.RouteParamtypes.BODY, data: null }, transforms)).to.be.true;
                contextCreator.getParamValue(value, { metatype, type: route_paramtypes_enum_1.RouteParamtypes.PARAM, data: null }, transforms);
                chai_1.expect(consumerApplySpy.calledWith(value, { metatype, type: route_paramtypes_enum_1.RouteParamtypes.PARAM, data: null }, transforms)).to.be.true;
            });
        });
        describe('when paramtype is not query, body and param', () => {
            it('should not call "consumer.apply"', () => {
                contextCreator.getParamValue(value, { metatype, type: route_paramtypes_enum_1.RouteParamtypes.NEXT, data: null }, transforms);
                chai_1.expect(consumerApplySpy.called).to.be.false;
            });
        });
    });
});
//# sourceMappingURL=router-execution-context.spec.js.map