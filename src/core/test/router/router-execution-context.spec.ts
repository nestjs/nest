import * as sinon from 'sinon';
import { expect } from 'chai';
import { RouteParamtypes } from '../../../common/enums/route-paramtypes.enum';
import { RouterExecutionContext } from '../../router/router-execution-context';
import { RouteParamsMetadata, Request, Body } from '../../../index';
import { RouteParamsFactory } from '../../router/route-params-factory';

describe('RouterExecutionContext', () => {
    let contextCreator: RouterExecutionContext;
    let callback;
    let applySpy: sinon.SinonSpy;
    let bindSpy: sinon.SinonSpy;
    let factory: RouteParamsFactory;

    beforeEach(() => {
        callback = {
            bind: () => ({}),
            apply: () => ({}),
        };
        bindSpy = sinon.spy(callback, 'bind');
        applySpy = sinon.spy(callback, 'apply');
        factory = new RouteParamsFactory();
        contextCreator = new RouterExecutionContext(factory);
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
                        proxyContext(request, response, next);
                    });
                    it('should call "exchangeKeysForValues" with expected arguments', () => {
                        const keys = Object.keys(metadata).map(Number);

                        expect(exchangeKeysForValuesSpy.called).to.be.true;
                        expect(
                            exchangeKeysForValuesSpy.calledWith(keys, metadata, { req: request, res: response, next }),
                        ).to.be.true;
                    });
                    it('should apply expected context and arguments to callback', () => {
                        const args = [ next, null, request.body.test ];
                        expect(applySpy.called).to.be.true;
                        expect(applySpy.calledWith(instance, args)).to.be.true;
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
                [RouteParamtypes.REQUEST]: {
                    index: 0,
                    data: undefined,
                },
                [RouteParamtypes.BODY]: {
                    index: 1,
                    data: undefined,
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
                contextCreator.getArgumentsLength(Object.keys(metadata).map(Number), metadata),
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
        const req = { body: 'req' };
        const next = () => {};

        it('should exchange arguments keys for appropriate values', () => {
            const metadata = {
                [RouteParamtypes.REQUEST]: { index: 0 },
                [RouteParamtypes.BODY]: {
                    index: 2,
                },
            };
            const keys = Object.keys(metadata).map(Number);
            const values = contextCreator.exchangeKeysForValues(keys, metadata, { res, req, next });
            const expectedValues = [
                { index: 0, value: req },
                { index: 2, value: req.body },
            ];
            expect(values).to.deep.equal(expectedValues);
        });
    });
});