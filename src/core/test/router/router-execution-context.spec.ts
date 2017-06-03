import * as sinon from 'sinon';
import { expect } from 'chai';
import { RouteParamtypes } from '../../../common/enums/route-paramtypes.enum';
import { RouterExecutionContext } from '../../router/router-execution-context';
import { RouteParamsMetadata, Request, Body } from '../../../index';
import { RouteParamsFactory } from '../../router/route-params-factory';
import { PipesContextCreator } from '../../pipes/pipes-context-creator';
import { PipesConsumer } from '../../pipes/pipes-consumer';
import { ApplicationConfig } from '../../application-config';

describe('RouterExecutionContext', () => {
    let contextCreator: RouterExecutionContext;
    let callback;
    let applySpy: sinon.SinonSpy;
    let bindSpy: sinon.SinonSpy;
    let factory: RouteParamsFactory;
    let consumer: PipesConsumer;

    beforeEach(() => {
        callback = {
            bind: () => ({}),
            apply: () => ({}),
        };
        bindSpy = sinon.spy(callback, 'bind');
        applySpy = sinon.spy(callback, 'apply');

        factory = new RouteParamsFactory();
        consumer = new PipesConsumer();

        contextCreator = new RouterExecutionContext(
            factory, new PipesContextCreator(new ApplicationConfig()), consumer,
        );
    });
    describe('create', () => {
        describe('when callback metadata is undefined', () => {
            it('should only bind instance as an context', () => {
                const instance = {};
                contextCreator.create(instance, callback as any);
                expect(bindSpy.calledWith(instance)).to.be.true;
            });
        });
        describe('when callback metadata is not undefined', () => {
            let metadata: RouteParamsMetadata;
            beforeEach(() => {
                metadata = {
                    [RouteParamtypes.NEXT]: { index: 0 },
                    [RouteParamtypes.BODY]: {
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
                    proxyContext = contextCreator.create(instance, callback as any);
                });
                it('should be a function', () => {
                    expect(proxyContext).to.be.a('function');
                });
                describe('when proxy function called', () => {
                    let exchangeKeysForValuesSpy: sinon.SinonSpy;
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

                            expect(exchangeKeysForValuesSpy.called).to.be.true;
                            expect(
                                exchangeKeysForValuesSpy.calledWith(keys, metadata, { req: request, res: response, next }),
                            ).to.be.true;
                            done();
                        });
                    });
                    it('should apply expected context and arguments to callback', (done) => {
                        proxyContext(request, response, next).then(() => {
                            const args = [ next, null, request.body.test ];
                            expect(applySpy.called).to.be.true;
                            expect(applySpy.calledWith(instance, args)).to.be.true;
                            done();
                        });
                    });
                });
            });
        });
    });
    describe('reflectCallbackMetadata', () => {
        class TestController {
            public callback(@Request() req, @Body() body) {}
        }
        it('should returns ROUTE_ARGS_METADATA callback metadata', () => {
            const instance = new TestController();
            const metadata = contextCreator.reflectCallbackMetadata(instance, instance.callback);
            const expectedMetadata = {
                [`${RouteParamtypes.REQUEST}:0`]: {
                    index: 0,
                    data: undefined,
                    pipes: [],
                },
                [`${RouteParamtypes.BODY}:1`]: {
                    index: 1,
                    data: undefined,
                    pipes: [],
                },
            };
            expect(metadata).to.deep.equal(expectedMetadata);
        });
    });
    describe('getArgumentsLength', () => {
        it('should returns maximum index + 1 (length) placed in array', () => {
            const max = 4;
            const metadata = {
                [RouteParamtypes.REQUEST]: { index: 0 },
                [RouteParamtypes.BODY]: {
                    index: max,
                },
            };
            expect(
                contextCreator.getArgumentsLength(Object.keys(metadata), metadata),
            ).to.be.eq(max + 1);
        });
    });
    describe('createNullArray', () => {
        it('should create N size array filled with null', () => {
            const size = 3;
            expect(contextCreator.createNullArray(size)).to.be.deep.eq([ null, null, null ]);
        });
    });
    describe('exchangeKeysForValues', () => {
        const res = { body: 'res' };
        const req = { body: { test: 'req' } };
        const next = () => {};

        it('should exchange arguments keys for appropriate values', () => {
            const metadata = {
                [RouteParamtypes.REQUEST]: { index: 0, data: 'test', pipes: [] },
                [RouteParamtypes.BODY]: {
                    index: 2,
                    data: 'test',
                    pipes: [],
                },
            };
            const keys = Object.keys(metadata);
            const values = contextCreator.exchangeKeysForValues(keys, metadata, { res, req, next });
            const expectedValues = [
                { index: 0, value: req, type: RouteParamtypes.REQUEST, data: 'test', pipes: [] },
                { index: 2, value: req.body.test, type: RouteParamtypes.BODY, data: 'test', pipes: [] },
            ];
            expect(values).to.deep.equal(expectedValues);
        });
    });
    describe('getParamValue', () => {
        let consumerApplySpy: sinon.SinonSpy;
        const value = 3, metatype = null, transforms = [];

        beforeEach(() => {
            consumerApplySpy = sinon.spy(consumer, 'apply');
        });
        describe('when paramtype is query, body or param', () => {
            it('should call "consumer.apply" with expected arguments', () => {
                contextCreator.getParamValue(value, { metatype, type: RouteParamtypes.QUERY, data: null } , transforms);
                expect(consumerApplySpy.calledWith(value, { metatype, type: RouteParamtypes.QUERY, data: null }, transforms)).to.be.true;

                contextCreator.getParamValue(value, { metatype, type: RouteParamtypes.BODY, data: null }, transforms);
                expect(consumerApplySpy.calledWith(value, { metatype, type: RouteParamtypes.BODY, data: null }, transforms)).to.be.true;

                contextCreator.getParamValue(value, { metatype, type: RouteParamtypes.PARAM, data: null }, transforms);
                expect(consumerApplySpy.calledWith(value, { metatype, type: RouteParamtypes.PARAM, data: null }, transforms)).to.be.true;
            });
        });
        describe('when paramtype is not query, body and param', () => {
            it('should not call "consumer.apply"', () => {
                contextCreator.getParamValue(value, { metatype, type: RouteParamtypes.NEXT, data: null }, transforms);
                expect(consumerApplySpy.called).to.be.false;
            });
        });
    });
});