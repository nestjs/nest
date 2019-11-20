import { expect } from 'chai';
import * as sinon from 'sinon';
import { RouteParamMetadata, HttpStatus } from '../../../common';
import { CUSTOM_ROUTE_AGRS_METADATA } from '../../../common/constants';
import { RouteParamtypes } from '../../../common/enums/route-paramtypes.enum';
import { ApplicationConfig } from '../../application-config';
import { GuardsConsumer } from '../../guards/guards-consumer';
import { GuardsContextCreator } from '../../guards/guards-context-creator';
import { NestContainer } from '../../injector/container';
import { InterceptorsConsumer } from '../../interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '../../interceptors/interceptors-context-creator';
import { PipesConsumer } from '../../pipes/pipes-consumer';
import { PipesContextCreator } from '../../pipes/pipes-context-creator';
import { RouteParamsFactory } from '../../router/route-params-factory';
import { RouterExecutionContext } from '../../router/router-execution-context';
import { FORBIDDEN_MESSAGE } from '../../guards/constants';
import { ForbiddenException } from '@nestjs/common/exceptions/forbidden.exception';
import { RouterInterceptorsConsumer } from '../../interceptors/router-interceptors-consumer';
import { RouterRenderInterceptorsConsumer } from '../../interceptors/router-render-interceptors-consumer';
import { RouterResponseController } from '../../router/router-response-controller';

describe('RouterExecutionContext', () => {
  let contextCreator: RouterExecutionContext;
  let callback;
  let applySpy: sinon.SinonSpy;
  let bindSpy: sinon.SinonSpy;
  let factory: RouteParamsFactory;
  let consumer: PipesConsumer;
  let guardsConsumer: GuardsConsumer;
  let interceptorsConsumer: RouterInterceptorsConsumer;

  let responseControllerSetStatusSpy: sinon.SinonSpy;
  let responseControllerSetHeadersSpy: sinon.SinonSpy;
  let responseControllerApplySpy: sinon.SinonSpy;
  let responseControllerTransformToResultSpy: sinon.SinonSpy;
  let awaitedTransformedResponse: any;
  const awaitedTransformedRender = 'transformedRender';

  let routerResponseController: RouterResponseController;
  beforeEach(() => {
    callback = {
      bind: () => ({}),
      apply: () => ({}),
    };
    bindSpy = sinon.spy(callback, 'bind');
    applySpy = sinon.spy(callback, 'apply');

    factory = new RouteParamsFactory();
    consumer = new PipesConsumer();
    guardsConsumer = new GuardsConsumer();
    interceptorsConsumer = new RouterInterceptorsConsumer(
      new InterceptorsConsumer(),
      new RouterRenderInterceptorsConsumer(),
    );
    routerResponseController = new RouterResponseController(undefined);
    contextCreator = new RouterExecutionContext(
      factory,
      new PipesContextCreator(new NestContainer(), new ApplicationConfig()),
      consumer,
      new GuardsContextCreator(new NestContainer()),
      guardsConsumer,
      new InterceptorsContextCreator(new NestContainer()),
      interceptorsConsumer,
      routerResponseController,
    );
    responseControllerSetStatusSpy = sinon.stub(
      routerResponseController,
      'setStatus',
    );
    responseControllerSetHeadersSpy = sinon.stub(
      routerResponseController,
      'setHeaders',
    );
    responseControllerApplySpy = sinon.stub(routerResponseController, 'apply');

    awaitedTransformedResponse = 'transformedResponse';
    responseControllerTransformToResultSpy = sinon
      .stub(routerResponseController, 'transformToResult')
      .onFirstCall()
      .callsFake(() => Promise.resolve(awaitedTransformedResponse))
      .onSecondCall()
      .callsFake(() => Promise.resolve(awaitedTransformedRender));
  });
  describe('create', () => {
    describe('when callback metadata is not undefined', () => {
      let metadata: Record<number, RouteParamMetadata>;
      let exchangeKeysForValuesSpy: sinon.SinonSpy;
      beforeEach(() => {
        metadata = {
          [RouteParamtypes.NEXT]: { index: 0 },
          [RouteParamtypes.BODY]: {
            index: 2,
            data: 'test',
          },
        };
        sinon
          .stub((contextCreator as any).contextUtils, 'reflectCallbackMetadata')
          .returns(metadata);
        sinon
          .stub(
            (contextCreator as any).contextUtils,
            'reflectCallbackParamtypes',
          )
          .returns([]);
        exchangeKeysForValuesSpy = sinon.spy(
          contextCreator,
          'exchangeKeysForValues',
        );
      });
      it('should call "exchangeKeysForValues" with expected arguments', done => {
        const keys = Object.keys(metadata);

        contextCreator.create({ foo: 'bar' }, callback as any, '', '', 0);
        expect(exchangeKeysForValuesSpy.called).to.be.true;
        expect(exchangeKeysForValuesSpy.calledWith(keys, metadata)).to.be.true;
        done();
      });
      describe('returns proxy function', () => {
        let proxyContext;
        let instance;
        let tryActivateStub;
        beforeEach(() => {
          instance = { foo: 'bar' };
          const canActivateFn = contextCreator.createGuardsFn([1], null, null);
          sinon.stub(contextCreator, 'createGuardsFn').returns(canActivateFn);
          tryActivateStub = sinon
            .stub(guardsConsumer, 'tryActivate')
            .callsFake(async () => true);
          proxyContext = contextCreator.create(
            instance,
            callback as any,
            '',
            '',
            0,
          );
        });
        it('should be a function', () => {
          expect(proxyContext).to.be.a('function');
        });
        describe('when proxy function called', () => {
          let request;
          const response = {
            status: () => response,
            send: () => response,
            json: () => response,
          };
          const next = {};

          beforeEach(() => {
            request = {
              body: {
                test: 3,
              },
            };
          });
          interface GetMetadataStubbedTestDetails {
            responseHeaders: any;
            matchSameResponse: any;
            httpStatusCode: any;
          }
          let responseFn: sinon.SinonSpy;
          async function getMetadataStubbedTest(
            interceptHandlerResponse = {
              result: 'The result',
              skipRender: true,
            },
          ): Promise<GetMetadataStubbedTestDetails> {
            const res = {};
            const matchSameResponse = sinon.match.same(res);
            const responseHeaders = [
              { name: 'header1', value: 'header1Value' },
            ];

            contextCreator = new RouterExecutionContext(
              factory,
              {
                create() {
                  return null;
                },
              } as any,
              undefined,
              {
                create() {
                  return null;
                },
              } as any,
              undefined,
              {
                create() {
                  return null;
                },
              } as any,
              {
                interceptHandlerResponse() {
                  return interceptHandlerResponse;
                },
              } as any,
              routerResponseController,
            );
            responseFn = sinon.stub();
            const httpStatusCode = 999;
            sinon.stub(contextCreator, 'getMetadata').returns({
              httpStatusCode,
              fnHandleResponse: responseFn,
              getParamsMetadata() {
                return [];
              },
              hasCustomHeaders: true,
              responseHeaders,
            } as any);
            sinon
              .stub(contextCreator, 'createPipesFn')
              .returns((() => {}) as any);
            sinon.stub(contextCreator, 'createGuardsFn').returns(undefined);
            const proxyFunction = contextCreator.create(
              null,
              null,
              '',
              '',
              null,
            );

            await proxyFunction(null, res, null);

            return {
              httpStatusCode,
              responseHeaders,
              matchSameResponse,
            };
          }
          describe('sets response properties based upon getMetadata', () => {
            let testDetails: GetMetadataStubbedTestDetails;
            beforeEach(async () => {
              testDetails = await getMetadataStubbedTest();
            });
            it('should responseController.setStatus', () => {
              expect(
                responseControllerSetStatusSpy.calledWithExactly(
                  testDetails.matchSameResponse,
                  testDetails.httpStatusCode,
                ),
              ).to.be.true;
            });

            it('should responseController.setHeaders if has custom headers', () => {
              expect(
                responseControllerSetHeadersSpy.calledWithExactly(
                  testDetails.matchSameResponse,
                  testDetails.responseHeaders,
                ),
              ).to.be.true;
            });
          });
          it('should handle the response from interceptorsConsumer.interceptHandlerResponse', async () => {
            const testDetails = await getMetadataStubbedTest();
            expect(
              responseFn.calledOnceWithExactly(
                'The result',
                testDetails.matchSameResponse,
                true,
              ),
            ).to.be.true;
          });

          it('should apply expected context and arguments to callback', done => {
            tryActivateStub.callsFake(async () => true);
            proxyContext(request, response, next).then(() => {
              const args = [next, undefined, request.body.test];
              expect(applySpy.called).to.be.true;
              expect(applySpy.calledWith(instance, args)).to.be.true;
              done();
            });
          });
          it('should throw ForbiddenException when "tryActivate" returns false', async () => {
            tryActivateStub.callsFake(async () => false);
            let error: Error;
            try {
              await proxyContext(request, response, next);
            } catch (e) {
              error = e;
            }
            expect(error).to.be.instanceOf(ForbiddenException);
            expect(error.message).to.be.eql({
              statusCode: HttpStatus.FORBIDDEN,
              error: 'Forbidden',
              message: FORBIDDEN_MESSAGE,
            });
          });
          it('should apply expected context when "canActivateFn" apply', () => {
            proxyContext(request, response, next).then(() => {
              expect(tryActivateStub.args[0][1][0]).to.equals(request);
              expect(tryActivateStub.args[0][1][1]).to.equals(response);
              expect(tryActivateStub.args[0][1][2]).to.equals(next);
            });
          });
          it('should apply expected context when "intercept" apply', async () => {
            const interceptStub = sinon
              .stub(interceptorsConsumer, 'interceptHandlerResponse')
              .returns(Promise.resolve({ result: '', skipRender: false }));
            await proxyContext(request, response, next);
            expect(interceptStub.args[0][1][0]).to.equals(request);
            expect(interceptStub.args[0][1][1]).to.equals(response);
            expect(interceptStub.args[0][1][2]).to.equals(next);
          });
        });
      });
    });
  });
  describe('exchangeKeysForValues', () => {
    const res = { body: 'res' };
    const req = { body: { test: 'req' } };
    const next = () => {};

    it('should exchange arguments keys for appropriate values', () => {
      const metadata = {
        [RouteParamtypes.REQUEST]: { index: 0, data: 'test', pipes: [] },
        [RouteParamtypes.BODY]: { index: 2, data: 'test', pipes: [] },
        [`key${CUSTOM_ROUTE_AGRS_METADATA}`]: {
          index: 3,
          data: 'custom',
          pipes: [],
        },
      };
      const keys = Object.keys(metadata);
      const values = contextCreator.exchangeKeysForValues(keys, metadata, '');
      const expectedValues = [
        { index: 0, type: RouteParamtypes.REQUEST, data: 'test' },
        { index: 2, type: RouteParamtypes.BODY, data: 'test' },
        { index: 3, type: `key${CUSTOM_ROUTE_AGRS_METADATA}`, data: 'custom' },
      ];
      expect(values[0]).to.deep.include(expectedValues[0]);
      expect(values[1]).to.deep.include(expectedValues[1]);
    });
  });
  describe('getCustomFactory', () => {
    describe('when factory is function', () => {
      it('should return curried factory', () => {
        const data = 3;
        const result = 10;
        const customFactory = (_, req) => result;

        expect(
          contextCreator.getCustomFactory(customFactory, data)(),
        ).to.be.eql(result);
      });
    });
    describe('when factory is undefined / is not a function', () => {
      it('should return curried null identity', () => {
        const result = 10;
        const customFactory = undefined;
        expect(
          contextCreator.getCustomFactory(customFactory, undefined)(),
        ).to.be.eql(null);
      });
    });
  });

  describe('getParamValue', () => {
    let consumerApplySpy: sinon.SinonSpy;
    const value = 3,
      metatype = null,
      transforms = [{ transform: sinon.spy() }];

    beforeEach(() => {
      consumerApplySpy = sinon.spy(consumer, 'apply');
    });
    describe('when paramtype is query, body or param', () => {
      it('should call "consumer.apply" with expected arguments', () => {
        contextCreator.getParamValue(
          value,
          { metatype, type: RouteParamtypes.QUERY, data: null },
          transforms,
        );
        expect(
          consumerApplySpy.calledWith(
            value,
            { metatype, type: RouteParamtypes.QUERY, data: null },
            transforms,
          ),
        ).to.be.true;

        contextCreator.getParamValue(
          value,
          { metatype, type: RouteParamtypes.BODY, data: null },
          transforms,
        );
        expect(
          consumerApplySpy.calledWith(
            value,
            { metatype, type: RouteParamtypes.BODY, data: null },
            transforms,
          ),
        ).to.be.true;

        contextCreator.getParamValue(
          value,
          { metatype, type: RouteParamtypes.PARAM, data: null },
          transforms,
        );
        expect(
          consumerApplySpy.calledWith(
            value,
            { metatype, type: RouteParamtypes.PARAM, data: null },
            transforms,
          ),
        ).to.be.true;
      });
    });
  });
  describe('isPipeable', () => {
    describe('when paramtype is not query, body, param and custom', () => {
      it('should return false', () => {
        const result = contextCreator.isPipeable(RouteParamtypes.NEXT);
        expect(result).to.be.false;
      });
      it('otherwise', () => {
        expect(contextCreator.isPipeable(RouteParamtypes.BODY)).to.be.true;
        expect(contextCreator.isPipeable(RouteParamtypes.QUERY)).to.be.true;
        expect(contextCreator.isPipeable(RouteParamtypes.PARAM)).to.be.true;
        expect(contextCreator.isPipeable('custom')).to.be.true;
      });
    });
  });
  describe('createPipesFn', () => {
    describe('when "paramsOptions" is empty', () => {
      it('returns null', async () => {
        const pipesFn = contextCreator.createPipesFn([], []);
        expect(pipesFn).to.be.null;
      });
    });
  });
  describe('createGuardsFn', () => {
    it('should throw ForbiddenException when "tryActivate" returns false', async () => {
      const guardsFn = contextCreator.createGuardsFn([null], null, null);
      sinon.stub(guardsConsumer, 'tryActivate').callsFake(async () => false);
      let error: ForbiddenException;
      try {
        await guardsFn([]);
      } catch (e) {
        error = e;
      }
      expect(error).to.be.instanceOf(ForbiddenException);
      expect(error.message).to.be.eql({
        statusCode: HttpStatus.FORBIDDEN,
        error: 'Forbidden',
        message: FORBIDDEN_MESSAGE,
      });
    });
  });
  describe('createHandleResponseFn', () => {
    describe('with respect to rendering', () => {
      let isResponseHandled: boolean;

      const template = 'template';
      const awaitedRenderedViewToString = '<div>Rendered to string</div>';
      const awaitedRenderInterceptedView = 'render intercepted view';

      const result = 'result';
      const response = {};
      const sameResponseMatch = sinon.match.same(response);

      let skipRender: boolean;

      let interceptorsConsumerRenderInterceptSpy: sinon.SinonSpy;
      let interceptorsConsumerCanRenderIntercept: boolean;

      let responseControllerCanRenderToString: boolean;
      let responseControllerSetContentTypeHtmlSpy: sinon.SinonSpy;
      let responseControllerRenderSpy: sinon.SinonSpy;
      let responseControllerRenderToStringSpy: sinon.SinonSpy;

      beforeEach(() => {
        // default - render interception path
        interceptorsConsumerCanRenderIntercept = true;
        responseControllerCanRenderToString = true;
      });
      afterEach(() => {
        expect(responseControllerTransformToResultSpy.firstCall.args[0]).to.eql(
          'result',
        );
      });
      async function executeTemplateTest() {
        sinon.stub(contextCreator, 'reflectRenderTemplate').returns(template);

        sinon
          .stub(routerResponseController, 'canRenderToString')
          .returns(responseControllerCanRenderToString);
        responseControllerSetContentTypeHtmlSpy = sinon.stub(
          routerResponseController,
          'setContentTypeHtml',
        );
        responseControllerRenderSpy = sinon.stub(
          routerResponseController,
          'render',
        );
        responseControllerRenderToStringSpy = sinon
          .stub(routerResponseController, 'renderToString')
          .returns(Promise.resolve(awaitedRenderedViewToString));

        sinon
          .stub(interceptorsConsumer, 'canRenderIntercept')
          .returns(interceptorsConsumerCanRenderIntercept);
        interceptorsConsumerRenderInterceptSpy = sinon
          .stub(interceptorsConsumer, 'renderIntercept')
          .returns(Promise.resolve(awaitedRenderInterceptedView));

        const handler = contextCreator.createHandleResponseFn(
          null,
          isResponseHandled,
          undefined,
        );

        await handler(result, response, skipRender);
      }
      enum NoRenderInterceptionReason {
        NoRenderInterceptors,
        AdapterNoRenderToString,
      }
      function preventRenderInterception(reason: NoRenderInterceptionReason) {
        if (reason === NoRenderInterceptionReason.AdapterNoRenderToString) {
          responseControllerCanRenderToString = false;
        } else {
          interceptorsConsumerCanRenderIntercept = false;
        }
      }
      function expectRenderIntercepted(expectedView: string) {
        expect(
          interceptorsConsumerRenderInterceptSpy.calledOnceWithExactly(
            expectedView,
          ),
        ).to.be.true;
        expect(
          responseControllerTransformToResultSpy.secondCall.args[0],
        ).to.be.eql(awaitedRenderInterceptedView);
        expect(
          responseControllerApplySpy.calledOnceWithExactly(
            awaitedTransformedRender,
            sameResponseMatch,
            undefined,
          ),
        ).to.be.true;
      }
      // isResponseHandled does not affect render processing
      [true, false].forEach(responseHandled => {
        describe(`and "renderTemplate" is defined ${
          responseHandled ? 'response handled' : 'response not handled'
        }`, () => {
          isResponseHandled = responseHandled;
          describe('and not overridden by interceptor', () => {
            beforeEach(() => {
              skipRender = false;
            });
            describe('and not render intercepting', () => {
              const preventRenderInterceptions: NoRenderInterceptionReason[] = [
                NoRenderInterceptionReason.AdapterNoRenderToString,
                NoRenderInterceptionReason.NoRenderInterceptors,
              ];
              preventRenderInterceptions.forEach(reason => {
                describe(`as ${
                  reason === NoRenderInterceptionReason.NoRenderInterceptors
                    ? 'no render interceptors'
                    : 'adapter no renderToString'
                }`, () => {
                  it('should call "res.render()" with expected args', async () => {
                    preventRenderInterception(reason);

                    await executeTemplateTest();
                    expect(
                      responseControllerRenderSpy.calledOnceWithExactly(
                        awaitedTransformedResponse,
                        sameResponseMatch,
                        template,
                      ),
                    ).to.be.true;
                  });
                });
              });
            });
            describe('and render intercepting', () => {
              beforeEach(async () => {
                await executeTemplateTest();
              });
              it('should call responseController.renderToString with expected args', () => {
                expect(
                  responseControllerRenderToStringSpy!.calledOnceWithExactly(
                    awaitedTransformedResponse,
                    sameResponseMatch,
                    template,
                  ),
                ).to.be.true;
              });
              it('should apply the renderIntercepted view', () => {
                expectRenderIntercepted(awaitedRenderedViewToString);
              });
            });
          });
          describe('and overridden by interceptor', () => {
            beforeEach(() => {
              skipRender = true;
            });
            describe('with transformed result not a string', () => {
              it('should throw error', async () => {
                awaitedTransformedResponse = {};

                let templateTestError: Error;
                try {
                  await executeTemplateTest();
                } catch (e) {
                  templateTestError = e;
                }

                expect(templateTestError!.message).to.be.eql(
                  'NestInterceptor.intercept rendered - result is not a string',
                );
              });
            });
            describe('with transformed result as string', () => {
              it('should set content-type header to text/html', async () => {
                await executeTemplateTest();
                expect(
                  responseControllerSetContentTypeHtmlSpy.calledOnceWithExactly(
                    sameResponseMatch,
                  ),
                ).to.be.true;
              });
              describe('and interceptors consumer can render intercept', () => {
                it('should apply the transformed renderIntercept to the response', async () => {
                  await executeTemplateTest();
                  expectRenderIntercepted(awaitedTransformedResponse);
                });
              });
              describe('and interceptors consumer cannot render intercept', () => {
                it('should call "adapter.reply()" with expected args', async () => {
                  interceptorsConsumerCanRenderIntercept = false;

                  await executeTemplateTest();
                  expect(
                    responseControllerApplySpy.calledOnceWithExactly(
                      awaitedTransformedResponse,
                      sameResponseMatch,
                      undefined,
                    ),
                  ).to.be.true;
                });
              });
            });
          });
        });
      });
    });

    describe('when "redirectResponse" is present', () => {
      it('should call "responseController.redirect()" with expected args', async () => {
        const redirectResponse = {
          url: 'http://test.com',
          statusCode: 302,
        };
        const response = {};
        const result = 'result';

        const handler = contextCreator.createHandleResponseFn(
          () => {},
          true,
          redirectResponse,
          200,
        );
        const redirectSpy = sinon.stub(routerResponseController, 'redirect');
        await handler(result, response);
        expect(
          redirectSpy.calledOnceWithExactly(
            'result',
            sinon.match.same(response),
            redirectResponse,
          ),
        ).to.be.true;
      });
    });

    describe('when "redirectResponse" is undefined', () => {
      it('should not call "responseController.redirect()"', async () => {
        const result = Promise.resolve('test');
        const response = {};
        sinon.stub(contextCreator, 'reflectRenderTemplate').returns(undefined);
        const redirectSpy = sinon.spy(routerResponseController, 'redirect');
        const handler = contextCreator.createHandleResponseFn(
          null,
          true,
          undefined,
          200,
        );
        await handler(result, response);

        expect(redirectSpy.called).to.be.false;
      });
    });
    describe('when replying with result', () => {
      it('should call "responseController.apply()" with expected args', async () => {
        const result = Promise.resolve('test');
        const response = {};

        sinon.stub(contextCreator, 'reflectRenderTemplate').returns(undefined);

        const handler = contextCreator.createHandleResponseFn(
          null,
          false,
          undefined,
          1234,
        );
        await handler(result, response);
        expect(
          responseControllerTransformToResultSpy.calledOnceWithExactly(result),
        ).to.be.true;
        expect(
          responseControllerApplySpy.calledOnceWithExactly(
            awaitedTransformedResponse,
            sinon.match.same(response),
            1234,
          ),
        ).to.be.true;
      });
    });
  });
});
