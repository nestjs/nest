import { ForbiddenException } from '@nestjs/common/exceptions/forbidden.exception.js';
import { of } from 'rxjs';
import { PassThrough } from 'stream';
import {
  HttpException,
  HttpStatus,
  RouteParamMetadata,
} from '../../../common/index.js';
import { CUSTOM_ROUTE_ARGS_METADATA } from '../../../common/constants.js';
import { RouteParamtypes } from '../../../common/enums/route-paramtypes.enum.js';
import { AbstractHttpAdapter } from '../../adapters/index.js';
import { ApplicationConfig } from '../../application-config.js';
import { FORBIDDEN_MESSAGE } from '../../guards/constants.js';
import { GuardsConsumer } from '../../guards/guards-consumer.js';
import { GuardsContextCreator } from '../../guards/guards-context-creator.js';
import { HandlerResponseBasicFn } from '../../helpers/handler-metadata-storage.js';
import { NestContainer } from '../../injector/container.js';
import { InterceptorsConsumer } from '../../interceptors/interceptors-consumer.js';
import { InterceptorsContextCreator } from '../../interceptors/interceptors-context-creator.js';
import { PipesConsumer } from '../../pipes/pipes-consumer.js';
import { PipesContextCreator } from '../../pipes/pipes-context-creator.js';
import { RouteParamsFactory } from '../../router/route-params-factory.js';
import { RouterExecutionContext } from '../../router/router-execution-context.js';
import { HeaderStream } from '../../router/sse-stream.js';
import { NoopHttpAdapter } from '../utils/noop-adapter.js';

describe('RouterExecutionContext', () => {
  let contextCreator: RouterExecutionContext;
  let callback: any;
  let applySpy: ReturnType<typeof vi.fn>;
  let factory: RouteParamsFactory;
  let consumer: PipesConsumer;
  let guardsConsumer: GuardsConsumer;
  let interceptorsConsumer: InterceptorsConsumer;
  let adapter: AbstractHttpAdapter;

  beforeEach(() => {
    callback = {
      bind: () => ({}),
      apply: () => ({}),
    };
    applySpy = vi.spyOn(callback, 'apply');

    factory = new RouteParamsFactory();
    consumer = new PipesConsumer();
    guardsConsumer = new GuardsConsumer();
    interceptorsConsumer = new InterceptorsConsumer();
    adapter = new NoopHttpAdapter({});
    contextCreator = new RouterExecutionContext(
      factory,
      new PipesContextCreator(new NestContainer(), new ApplicationConfig()),
      consumer,
      new GuardsContextCreator(new NestContainer()),
      guardsConsumer,
      new InterceptorsContextCreator(new NestContainer()),
      interceptorsConsumer,
      adapter,
    );
  });
  describe('create', () => {
    describe('when callback metadata is not undefined', () => {
      let metadata: Record<number, RouteParamMetadata>;
      let exchangeKeysForValuesSpy: ReturnType<typeof vi.fn>;
      beforeEach(() => {
        metadata = {
          [RouteParamtypes.NEXT]: { index: 0 },
          [RouteParamtypes.BODY]: {
            index: 2,
            data: 'test',
          },
        };
        vi.spyOn(
          (contextCreator as any).contextUtils,
          'reflectCallbackMetadata',
        ).mockReturnValue(metadata);
        vi.spyOn(
          (contextCreator as any).contextUtils,
          'reflectCallbackParamtypes',
        ).mockReturnValue([]);
        exchangeKeysForValuesSpy = vi.spyOn(
          contextCreator,
          'exchangeKeysForValues',
        );
      });
      it('should call "exchangeKeysForValues" with expected arguments', () =>
        new Promise<void>(done => {
          const keys = Object.keys(metadata);

          contextCreator.create({ foo: 'bar' }, callback, '', '', 0);
          expect(exchangeKeysForValuesSpy).toHaveBeenCalled();
          expect(exchangeKeysForValuesSpy).toHaveBeenCalledWith(
            keys,
            metadata,
            '',
            expect.anything(),
            undefined,
            expect.any(Function),
          );
          done();
        }));
      describe('returns proxy function', () => {
        let proxyContext;
        let instance;
        let tryActivateStub;
        beforeEach(() => {
          instance = { foo: 'bar' };

          const canActivateFn = contextCreator.createGuardsFn(
            [1] as any,
            null!,
            null!,
          );
          vi.spyOn(contextCreator, 'createGuardsFn').mockReturnValue(
            canActivateFn,
          );
          tryActivateStub = vi
            .spyOn(guardsConsumer, 'tryActivate')
            .mockImplementation(async () => true);
          proxyContext = contextCreator.create(instance, callback, '', '', 0);
        });
        it('should be a function', () => {
          expect(proxyContext).toBeTypeOf('function');
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
          it('should apply expected context and arguments to callback', () =>
            new Promise<void>(done => {
              tryActivateStub.mockImplementation(async () => true);
              proxyContext(request, response, next).then(() => {
                const args = [next, undefined, request.body.test];
                expect(applySpy).toHaveBeenCalled();
                expect(applySpy).toHaveBeenCalledWith(instance, args);
                done();
              });
            }));
          it('should throw exception when "tryActivate" returns false', async () => {
            tryActivateStub.mockImplementation(async () => false);

            let error: HttpException;
            try {
              await proxyContext(request, response, next);
            } catch (e) {
              error = e;
            }
            expect(error!).toBeInstanceOf(ForbiddenException);
            expect(error!.message).toEqual('Forbidden resource');
            expect(error!.getResponse()).toEqual({
              statusCode: HttpStatus.FORBIDDEN,
              error: 'Forbidden',
              message: FORBIDDEN_MESSAGE,
            });
          });
          it('should apply expected context when "canActivateFn" apply', () => {
            proxyContext(request, response, next).then(() => {
              expect(tryActivateStub.mock.calls[0][1][0]).toBe(request);
              expect(tryActivateStub.mock.calls[0][1][1]).toBe(response);
              expect(tryActivateStub.mock.calls[0][1][2]).toBe(next);
            });
          });
          it('should apply expected context when "intercept" apply', () => {
            const interceptStub = vi
              .spyOn(interceptorsConsumer, 'intercept')
              .mockImplementation(() => ({}) as any);
            proxyContext(request, response, next).then(() => {
              expect(interceptStub.mock.calls[0][1][0]).toBe(request);
              expect(interceptStub.mock.calls[0][1][1]).toBe(response);
              expect(interceptStub.mock.calls[0][1][2]).toBe(next);
            });
          });
        });
      });
    });
  });

  describe('exchangeKeysForValues', () => {
    it('should exchange arguments keys for appropriate values', () => {
      const metadata = {
        [RouteParamtypes.REQUEST]: { index: 0, data: 'test', pipes: [] },
        [RouteParamtypes.BODY]: { index: 2, data: 'test', pipes: [] },
        [`key${CUSTOM_ROUTE_ARGS_METADATA}`]: {
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
        { index: 3, type: `key${CUSTOM_ROUTE_ARGS_METADATA}`, data: 'custom' },
      ];
      expect(values[0]).toMatchObject(expectedValues[0]);
      expect(values[1]).toMatchObject(expectedValues[1]);
    });
  });

  describe('getParamValue', () => {
    let consumerApplySpy: ReturnType<typeof vi.fn>;
    const value = 3,
      metatype = null,
      transforms = [{ transform: vi.fn() }];

    beforeEach(() => {
      consumerApplySpy = vi.spyOn(consumer, 'apply');
    });
    describe('when paramtype is query, body, rawBody or param', () => {
      it('should call "consumer.apply" with expected arguments', async () => {
        await contextCreator.getParamValue(
          value,
          { metatype, type: RouteParamtypes.QUERY, data: null },
          transforms,
        );
        expect(consumerApplySpy).toHaveBeenCalledWith(
          value,
          { metatype, type: RouteParamtypes.QUERY, data: null },
          transforms,
        );

        await contextCreator.getParamValue(
          value,
          { metatype, type: RouteParamtypes.BODY, data: null },
          transforms,
        );
        expect(consumerApplySpy).toHaveBeenCalledWith(
          value,
          { metatype, type: RouteParamtypes.BODY, data: null },
          transforms,
        );

        await contextCreator.getParamValue(
          value,
          { metatype, type: RouteParamtypes.RAW_BODY, data: null },
          transforms,
        );
        expect(consumerApplySpy).toHaveBeenCalledWith(
          value,
          { metatype, type: RouteParamtypes.RAW_BODY, data: null },
          transforms,
        );

        await contextCreator.getParamValue(
          value,
          { metatype, type: RouteParamtypes.PARAM, data: null },
          transforms,
        );
        expect(consumerApplySpy).toHaveBeenCalledWith(
          value,
          { metatype, type: RouteParamtypes.PARAM, data: null },
          transforms,
        );
      });
    });
  });
  describe('isPipeable', () => {
    describe('when paramtype is not query, body, param and custom', () => {
      it('should return false', () => {
        const result = contextCreator.isPipeable(RouteParamtypes.NEXT);
        expect(result).toBe(false);
      });
      it('otherwise', () => {
        expect(contextCreator.isPipeable(RouteParamtypes.BODY)).toBe(true);
        expect(contextCreator.isPipeable(RouteParamtypes.RAW_BODY)).toBe(true);
        expect(contextCreator.isPipeable(RouteParamtypes.QUERY)).toBe(true);
        expect(contextCreator.isPipeable(RouteParamtypes.PARAM)).toBe(true);
        expect(contextCreator.isPipeable(RouteParamtypes.FILE)).toBe(true);
        expect(contextCreator.isPipeable(RouteParamtypes.FILES)).toBe(true);
        expect(contextCreator.isPipeable('custom')).toBe(true);
      });
    });
  });
  describe('createPipesFn', () => {
    describe('when "paramsOptions" is empty', () => {
      it('returns null', async () => {
        const pipesFn = contextCreator.createPipesFn([], []);
        expect(pipesFn).toBeNull();
      });
    });
  });
  describe('createGuardsFn', () => {
    it('should throw ForbiddenException when "tryActivate" returns false', async () => {
      const guardsFn = contextCreator.createGuardsFn([null!], null!, null!)!;
      vi.spyOn(guardsConsumer, 'tryActivate').mockImplementation(
        async () => false,
      );

      let error: ForbiddenException;
      try {
        await guardsFn([]);
      } catch (e) {
        error = e;
      }

      expect(error!).toBeInstanceOf(ForbiddenException);
      expect(error!.message).toEqual('Forbidden resource');
      expect(error!.getResponse()).toEqual({
        statusCode: HttpStatus.FORBIDDEN,
        message: FORBIDDEN_MESSAGE,
        error: 'Forbidden',
      });
    });
  });
  describe('createHandleResponseFn', () => {
    describe('when "renderTemplate" is defined', () => {
      beforeEach(() => {
        vi.spyOn(adapter, 'render').mockImplementation(
          (response, view: string, options: any) => {
            return response.render(view, options);
          },
        );
      });
      it('should call "res.render()" with expected args', async () => {
        const template = 'template';
        const value = 'test';
        const response = { render: vi.fn() };

        vi.spyOn(contextCreator, 'reflectRenderTemplate').mockReturnValue(
          template,
        );

        const handler = contextCreator.createHandleResponseFn(
          null!,
          true,
          undefined,
          200,
        ) as HandlerResponseBasicFn;
        await handler(value, response);

        expect(response.render).toHaveBeenCalledWith(template, value);
      });
    });
    describe('when "renderTemplate" is undefined', () => {
      it('should not call "res.render()"', async () => {
        const result = Promise.resolve('test');
        const response = { render: vi.fn() };

        vi.spyOn(contextCreator, 'reflectResponseHeaders').mockReturnValue([]);
        vi.spyOn(contextCreator, 'reflectRenderTemplate').mockReturnValue(
          undefined!,
        );
        vi.spyOn(contextCreator, 'reflectSse').mockReturnValue(undefined!);

        const handler = contextCreator.createHandleResponseFn(
          null!,
          true,
          undefined,
          200,
        ) as HandlerResponseBasicFn;
        await handler(result, response);

        expect(response.render).not.toHaveBeenCalled();
      });
    });
    describe('when "redirectResponse" is present', () => {
      beforeEach(() => {
        vi.spyOn(adapter, 'redirect').mockImplementation(
          (response, statusCode: number, url: string) => {
            return response.redirect(statusCode, url);
          },
        );
      });
      it('should call "res.redirect()" with expected args', async () => {
        const redirectResponse = {
          url: 'http://test.com',
          statusCode: 302,
        };
        const response = { redirect: vi.fn() };

        const handler = contextCreator.createHandleResponseFn(
          () => {},
          true,
          redirectResponse,
          200,
        ) as HandlerResponseBasicFn;
        await handler(redirectResponse, response);

        expect(response.redirect).toHaveBeenCalledWith(
          redirectResponse.statusCode,
          redirectResponse.url,
        );
      });
    });

    describe('when "redirectResponse" is undefined', () => {
      it('should not call "res.redirect()"', async () => {
        const result = Promise.resolve('test');
        const response = { redirect: vi.fn() };

        vi.spyOn(contextCreator, 'reflectResponseHeaders').mockReturnValue([]);
        vi.spyOn(contextCreator, 'reflectRenderTemplate').mockReturnValue(
          undefined!,
        );
        vi.spyOn(contextCreator, 'reflectSse').mockReturnValue(undefined!);

        const handler = contextCreator.createHandleResponseFn(
          null!,
          true,
          undefined,
          200,
        ) as HandlerResponseBasicFn;
        await handler(result, response);

        expect(response.redirect).not.toHaveBeenCalled();
      });
    });

    describe('when replying with result', () => {
      it('should call "adapter.reply()" with expected args', async () => {
        const result = Promise.resolve('test');
        const response = {};

        vi.spyOn(contextCreator, 'reflectRenderTemplate').mockReturnValue(
          undefined!,
        );
        vi.spyOn(contextCreator, 'reflectSse').mockReturnValue(undefined!);

        const handler = contextCreator.createHandleResponseFn(
          null!,
          false,
          undefined,
          1234,
        ) as HandlerResponseBasicFn;
        const adapterReplySpy = vi.spyOn(adapter, 'reply');
        await handler(result, response);
        expect(adapterReplySpy).toHaveBeenCalledWith(response, 'test', 1234);
      });
    });

    describe('when "isSse" is enabled', () => {
      it('should delegate result to SseStream', async () => {
        const result = of('test');
        const response = new PassThrough();
        response.write = vi.fn();

        const request = new PassThrough();
        request.on = vi.fn();

        vi.spyOn(contextCreator, 'reflectRenderTemplate').mockReturnValue(
          undefined!,
        );
        vi.spyOn(contextCreator, 'reflectSse').mockReturnValue('/');

        const handler = contextCreator.createHandleResponseFn(
          null!,
          true,
          undefined,
          200,
        ) as HandlerResponseBasicFn;
        await handler(result, response, request);

        expect(response.write).toHaveBeenCalled();
        expect(request.on).toHaveBeenCalled();
      });

      it('should not allow a non-observable result', async () => {
        const result = Promise.resolve('test');
        const response = new PassThrough();
        const request = new PassThrough();

        vi.spyOn(contextCreator, 'reflectRenderTemplate').mockReturnValue(
          undefined!,
        );
        vi.spyOn(contextCreator, 'reflectSse').mockReturnValue('/');

        const handler = contextCreator.createHandleResponseFn(
          null!,
          true,
          undefined,
          200,
        ) as HandlerResponseBasicFn;

        try {
          await handler(result, response, request);
        } catch (e) {
          expect(e.message).toBe(
            'You must return an Observable stream to use Server-Sent Events (SSE).',
          );
        }
      });

      it('should apply any headers that exists on the response', async () => {
        const result = of('test');
        const response = new PassThrough() as HeaderStream;
        response.write = vi.fn();
        response.writeHead = vi.fn();
        response.flushHeaders = vi.fn();
        response.getHeaders = vi
          .fn()
          .mockReturnValue({ 'access-control-headers': 'some-cors-value' });

        const request = new PassThrough();
        request.on = vi.fn();

        vi.spyOn(contextCreator, 'reflectRenderTemplate').mockReturnValue(
          undefined!,
        );
        vi.spyOn(contextCreator, 'reflectSse').mockReturnValue('/');

        const handler = contextCreator.createHandleResponseFn(
          null!,
          true,
          undefined,
          200,
        ) as HandlerResponseBasicFn;
        await handler(result, response, request);

        expect(response.writeHead).toHaveBeenCalledWith(
          200,
          expect.objectContaining({
            'access-control-headers': 'some-cors-value',
          }),
        );
      });
    });
  });
});
