import { ForbiddenException } from '@nestjs/common/exceptions/forbidden.exception';
import { expect } from 'chai';
import { EventEmitter } from 'events';
import {
  concatMap,
  lastValueFrom,
  Observable,
  of,
  ReplaySubject,
  Subject,
  throwError,
} from 'rxjs';
import * as sinon from 'sinon';
import { PassThrough } from 'stream';
import {
  HttpException,
  HttpStatus,
  RouteParamMetadata,
  StreamableFile,
} from '../../../common';
import { CUSTOM_ROUTE_ARGS_METADATA } from '../../../common/constants';
import { RouteParamtypes } from '../../../common/enums/route-paramtypes.enum';
import { AbstractHttpAdapter } from '../../adapters';
import { ApplicationConfig } from '../../application-config';
import { FORBIDDEN_MESSAGE } from '../../guards/constants';
import { GuardsConsumer } from '../../guards/guards-consumer';
import { GuardsContextCreator } from '../../guards/guards-context-creator';
import { HandlerResponseBasicFn } from '../../helpers/handler-metadata-storage';
import { NestContainer } from '../../injector/container';
import { InterceptorsConsumer } from '../../interceptors/interceptors-consumer';
import { InterceptorsContextCreator } from '../../interceptors/interceptors-context-creator';
import { PipesConsumer } from '../../pipes/pipes-consumer';
import { PipesContextCreator } from '../../pipes/pipes-context-creator';
import { RouteParamsFactory } from '../../router/route-params-factory';
import { RouterExecutionContext } from '../../router/router-execution-context';
import { HeaderStream } from '../../router/sse-stream';
import { NoopHttpAdapter } from '../utils/noop-adapter.spec';

describe('RouterExecutionContext', () => {
  let contextCreator: RouterExecutionContext;
  let callback: any;
  let applySpy: sinon.SinonSpy;
  let factory: RouteParamsFactory;
  let consumer: PipesConsumer;
  let guardsConsumer: GuardsConsumer;
  let interceptorsConsumer: InterceptorsConsumer;
  let adapter: AbstractHttpAdapter;

  const attachSocket = <T extends PassThrough>(request: T) =>
    Object.assign(request, {
      socket: Object.assign(new EventEmitter(), {
        setKeepAlive() {},
        setNoDelay() {},
        setTimeout() {},
      }),
    }) as T & {
      socket: EventEmitter & {
        setKeepAlive(): void;
        setNoDelay(): void;
        setTimeout(): void;
      };
    };

  beforeEach(() => {
    callback = {
      bind: () => ({}),
      apply: () => ({}),
    };
    applySpy = sinon.spy(callback, 'apply');

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
    it('should pass an unresolved Promise<Observable> to the SSE response handler', async () => {
      const result = Promise.resolve(of('test'));
      const fnHandleResponse = sinon.stub().resolves();

      sinon.stub(contextCreator, 'getMetadata').returns({
        argsLength: 0,
        fnHandleResponse,
        isSseHandler: true,
        paramtypes: [],
        getParamsMetadata: sinon.stub().returns([]),
        httpStatusCode: 200,
        hasCustomHeaders: false,
        responseHeaders: [],
      });
      sinon.stub(contextCreator, 'createGuardsFn').returns(null as any);
      sinon.stub(contextCreator, 'createPipesFn').returns(null as any);
      sinon.stub(interceptorsConsumer, 'intercept').returns(result as any);

      const proxy = contextCreator.create({} as any, callback, '', '', 0);
      await proxy({}, {}, sinon.stub());

      expect(fnHandleResponse.calledOnce).to.be.true;
      expect(fnHandleResponse.firstCall.args[0]).to.equal(result);
    });

    describe('when the route has interceptors', () => {
      const createProxy = (
        handlerResult: unknown,
        onHandlerObservable: () => void,
      ) => {
        const fnHandleResponse = sinon
          .stub()
          .callsFake(async (result, _res, _req, handlerObservable$) => {
            handlerObservable$.subscribe(onHandlerObservable);
            await lastValueFrom(result);
          });
        sinon.stub(contextCreator, 'getMetadata').returns({
          argsLength: 0,
          fnHandleResponse,
          isSseHandler: false,
          paramtypes: [],
          getParamsMetadata: sinon.stub().returns([]),
          httpStatusCode: 200,
          hasCustomHeaders: false,
          responseHeaders: [],
        } as any);
        sinon.stub(contextCreator, 'createGuardsFn').returns(null as any);
        sinon.stub(contextCreator, 'createPipesFn').returns(null as any);
        sinon
          .stub((contextCreator as any).interceptorsContextCreator, 'create')
          .returns([{ intercept: (_, next) => next.handle() }]);

        return contextCreator.create(
          {} as any,
          { apply: () => handlerResult } as any,
          '',
          '',
          0,
        );
      };

      it('should report an Observable returned by the handler', async () => {
        const onHandlerObservable = sinon.spy();
        const proxy = createProxy(of('test'), onHandlerObservable);

        await proxy({}, {}, sinon.stub());

        expect(onHandlerObservable.calledOnce).to.be.true;
      });

      it('should report an Observable the handler resolves to', async () => {
        const onHandlerObservable = sinon.spy();
        const proxy = createProxy(
          Promise.resolve(of('test')),
          onHandlerObservable,
        );

        await proxy({}, {}, sinon.stub());

        expect(onHandlerObservable.calledOnce).to.be.true;
      });

      it('should not report a non-Observable handler result', async () => {
        const onHandlerObservable = sinon.spy();
        const proxy = createProxy(Promise.resolve('test'), onHandlerObservable);

        await proxy({}, {}, sinon.stub());

        expect(onHandlerObservable.called).to.be.false;
      });

      it('should not call "then()" on a returned thenable more than once', async () => {
        const thenable = {
          then: sinon.stub().callsFake(resolve => resolve('test')),
        };
        const proxy = createProxy(thenable, sinon.spy());

        await proxy({}, {}, sinon.stub());

        expect(thenable.then.calledOnce).to.be.true;
      });
    });

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

        contextCreator.create({ foo: 'bar' }, callback, '', '', 0);
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

          const canActivateFn = contextCreator.createGuardsFn(
            [1] as any,
            null!,
            null!,
          );
          sinon.stub(contextCreator, 'createGuardsFn').returns(canActivateFn);
          tryActivateStub = sinon
            .stub(guardsConsumer, 'tryActivate')
            .callsFake(async () => true);
          proxyContext = contextCreator.create(instance, callback, '', '', 0);
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
          it('should apply expected context and arguments to callback', done => {
            tryActivateStub.callsFake(async () => true);
            proxyContext(request, response, next).then(() => {
              const args = [next, undefined, request.body.test];
              expect(applySpy.called).to.be.true;
              expect(applySpy.calledWith(instance, args)).to.be.true;
              done();
            });
          });
          it('should throw exception when "tryActivate" returns false', async () => {
            tryActivateStub.callsFake(async () => false);

            let error: HttpException;
            try {
              await proxyContext(request, response, next);
            } catch (e) {
              error = e;
            }
            expect(error!).to.be.instanceOf(ForbiddenException);
            expect(error!.message).to.be.eql('Forbidden resource');
            expect(error!.getResponse()).to.be.eql({
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
          it('should apply expected context when "intercept" apply', () => {
            const interceptStub = sinon.stub(interceptorsConsumer, 'intercept');
            proxyContext(request, response, next).then(() => {
              expect(interceptStub.args[0][1][0]).to.equals(request);
              expect(interceptStub.args[0][1][1]).to.equals(response);
              expect(interceptStub.args[0][1][2]).to.equals(next);
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
      expect(values[0]).to.deep.include(expectedValues[0]);
      expect(values[1]).to.deep.include(expectedValues[1]);
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
    describe('when paramtype is query, body, rawBody or param', () => {
      it('should call "consumer.apply" with expected arguments', async () => {
        await contextCreator.getParamValue(
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

        await contextCreator.getParamValue(
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

        await contextCreator.getParamValue(
          value,
          { metatype, type: RouteParamtypes.RAW_BODY, data: null },
          transforms,
        );
        expect(
          consumerApplySpy.calledWith(
            value,
            { metatype, type: RouteParamtypes.RAW_BODY, data: null },
            transforms,
          ),
        ).to.be.true;

        await contextCreator.getParamValue(
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
        expect(contextCreator.isPipeable(RouteParamtypes.RAW_BODY)).to.be.true;
        expect(contextCreator.isPipeable(RouteParamtypes.QUERY)).to.be.true;
        expect(contextCreator.isPipeable(RouteParamtypes.PARAM)).to.be.true;
        expect(contextCreator.isPipeable(RouteParamtypes.FILE)).to.be.true;
        expect(contextCreator.isPipeable(RouteParamtypes.FILES)).to.be.true;
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
      const guardsFn = contextCreator.createGuardsFn([null!], null!, null!)!;
      sinon.stub(guardsConsumer, 'tryActivate').callsFake(async () => false);

      let error: ForbiddenException;
      try {
        await guardsFn([]);
      } catch (e) {
        error = e;
      }

      expect(error!).to.be.instanceOf(ForbiddenException);
      expect(error!.message).to.be.eql('Forbidden resource');
      expect(error!.getResponse()).to.be.eql({
        statusCode: HttpStatus.FORBIDDEN,
        message: FORBIDDEN_MESSAGE,
        error: 'Forbidden',
      });
    });
  });
  describe('createHandleResponseFn', () => {
    describe('when "renderTemplate" is defined', () => {
      beforeEach(() => {
        sinon
          .stub(adapter, 'render')
          .callsFake((response, view: string, options: any) => {
            return response.render(view, options);
          });
      });
      it('should call "res.render()" with expected args', async () => {
        const template = 'template';
        const value = 'test';
        const response = { render: sinon.spy() };

        sinon.stub(contextCreator, 'reflectRenderTemplate').returns(template);

        const handler = contextCreator.createHandleResponseFn(
          null!,
          true,
          undefined,
          200,
        ) as HandlerResponseBasicFn;
        await handler(value, response);

        expect(response.render.calledWith(template, value)).to.be.true;
      });
    });
    describe('when "renderTemplate" is undefined', () => {
      it('should not call "res.render()"', async () => {
        const result = Promise.resolve('test');
        const response = { render: sinon.spy() };

        sinon.stub(contextCreator, 'reflectResponseHeaders').returns([]);
        sinon.stub(contextCreator, 'reflectRenderTemplate').returns(undefined!);
        sinon.stub(contextCreator, 'reflectSse').returns(undefined!);

        const handler = contextCreator.createHandleResponseFn(
          null!,
          true,
          undefined,
          200,
        ) as HandlerResponseBasicFn;
        await handler(result, response);

        expect(response.render.called).to.be.false;
      });
    });
    describe('when "redirectResponse" is present', () => {
      beforeEach(() => {
        sinon
          .stub(adapter, 'redirect')
          .callsFake((response, statusCode: number, url: string) => {
            return response.redirect(statusCode, url);
          });
      });
      it('should call "res.redirect()" with expected args', async () => {
        const redirectResponse = {
          url: 'http://test.com',
          statusCode: 302,
        };
        const response = { redirect: sinon.spy() };

        const handler = contextCreator.createHandleResponseFn(
          () => {},
          true,
          redirectResponse,
          200,
        ) as HandlerResponseBasicFn;
        await handler(redirectResponse, response);

        expect(
          response.redirect.calledWith(
            redirectResponse.statusCode,
            redirectResponse.url,
          ),
        ).to.be.true;
      });
    });

    describe('when "redirectResponse" is undefined', () => {
      it('should not call "res.redirect()"', async () => {
        const result = Promise.resolve('test');
        const response = { redirect: sinon.spy() };

        sinon.stub(contextCreator, 'reflectResponseHeaders').returns([]);
        sinon.stub(contextCreator, 'reflectRenderTemplate').returns(undefined!);
        sinon.stub(contextCreator, 'reflectSse').returns(undefined!);

        const handler = contextCreator.createHandleResponseFn(
          null!,
          true,
          undefined,
          200,
        ) as HandlerResponseBasicFn;
        await handler(result, response);

        expect(response.redirect.called).to.be.false;
      });
    });

    describe('when replying with result', () => {
      it('should call "adapter.reply()" with expected args', async () => {
        const result = Promise.resolve('test');
        const response = {};

        sinon.stub(contextCreator, 'reflectRenderTemplate').returns(undefined!);
        sinon.stub(contextCreator, 'reflectSse').returns(undefined!);

        const handler = contextCreator.createHandleResponseFn(
          null!,
          false,
          undefined,
          1234,
        ) as HandlerResponseBasicFn;
        const adapterReplySpy = sinon.spy(adapter, 'reply');
        await handler(result, response);
        expect(
          adapterReplySpy.calledOnceWithExactly(
            sinon.match.same(response),
            'test',
            1234,
          ),
        ).to.be.true;
      });
    });

    describe('when the client disconnects', () => {
      let handler: HandlerResponseBasicFn;
      let adapterReplySpy: sinon.SinonSpy;
      let request: { socket: EventEmitter & { destroyed?: boolean } };
      const response = {};

      const createProducer = () => {
        const producer = { subscribed: false, tornDown: false };
        const source = new Subject<string>();
        const observable = new Observable<string>(subscriber => {
          producer.subscribed = true;
          const subscription = source.subscribe(subscriber);
          return () => {
            producer.tornDown = true;
            subscription.unsubscribe();
          };
        });
        return { producer, source, observable };
      };

      beforeEach(() => {
        sinon.stub(contextCreator, 'reflectRenderTemplate').returns(undefined!);
        sinon.stub(contextCreator, 'reflectSse').returns(undefined!);
        handler = contextCreator.createHandleResponseFn(
          null!,
          false,
          undefined,
          200,
        ) as HandlerResponseBasicFn;
        adapterReplySpy = sinon.spy(adapter, 'reply');
        request = { socket: new EventEmitter() };
      });

      it('should still reply to a non-Observable result', async () => {
        request.socket.destroyed = true;
        const expressResponse = { socket: request.socket };

        await handler(Promise.resolve('test'), expressResponse, request);

        expect(adapterReplySpy.calledWith(expressResponse, 'test', 200)).to.be
          .true;
      });

      it('should tear down an Observable returned by the handler and not reply', async () => {
        const { producer, source, observable } = createProducer();

        const pending = handler(observable, response, request);
        source.next('partial');
        request.socket.emit('close');
        await pending;

        expect(producer.tornDown).to.be.true;
        expect(adapterReplySpy.called).to.be.false;
        expect(request.socket.listenerCount('close')).to.equal(0);
      });

      it('should not subscribe an Observable returned by the handler once the client is gone', async () => {
        const { producer, observable } = createProducer();
        request.socket.destroyed = true;

        await handler(observable, response, request);

        expect(producer.subscribed).to.be.false;
        expect(adapterReplySpy.called).to.be.false;
      });

      it('should watch the raw request socket (e.g. Fastify)', async () => {
        const { producer, observable } = createProducer();

        const pending = handler(observable, response, { raw: request });
        request.socket.emit('close');
        await pending;

        expect(producer.tornDown).to.be.true;
      });

      it('should reply and stop watching the socket once the Observable completes', async () => {
        await handler(of('a', 'b'), response, request);

        expect(adapterReplySpy.calledWith(response, 'b', 200)).to.be.true;
        expect(request.socket.listenerCount('close')).to.equal(0);
      });

      it('should propagate errors emitted before the client disconnects', async () => {
        const error = new Error('producer failed');

        try {
          await handler(
            throwError(() => error),
            response,
            request,
          );
          expect.fail('should have thrown');
        } catch (err) {
          expect(err).to.equal(error);
        }
      });

      it('should ignore a disconnect when the handler did not return the (intercepted) Observable', async () => {
        const { source, observable } = createProducer();
        const expressResponse = { socket: request.socket };

        const pending = handler(
          observable,
          expressResponse,
          request,
          new Subject(),
        );
        request.socket.emit('close');
        source.next('value');
        source.complete();
        await pending;

        expect(adapterReplySpy.calledWith(expressResponse, 'value', 200)).to.be
          .true;
      });

      it('should tear down an intercepted Observable once the handler reports its own Observable', async () => {
        const { producer, observable } = createProducer();
        const handlerObservable$ = new ReplaySubject<void>(1);

        const pending = handler(
          observable,
          response,
          request,
          handlerObservable$,
        );
        request.socket.emit('close');
        expect(producer.tornDown).to.be.false;

        request.socket.destroyed = true;
        handlerObservable$.next();
        await pending;

        expect(producer.tornDown).to.be.true;
        expect(adapterReplySpy.called).to.be.false;
      });

      it('should destroy the stream of a StreamableFile it does not send', async () => {
        const stream = new PassThrough();
        const files = new Subject<StreamableFile>();

        const pending = handler(files, response, request);
        files.next(new StreamableFile(stream));
        request.socket.emit('close');
        await pending;

        expect(adapterReplySpy.called).to.be.false;
        expect(stream.destroyed).to.be.true;
      });

      it('should destroy the stream of a StreamableFile an interceptor holds', async () => {
        const stream = new PassThrough();
        let holding!: () => void;
        const held = new Promise<void>(resolve => (holding = resolve));
        sinon.stub(contextCreator, 'getMetadata').returns({
          argsLength: 0,
          fnHandleResponse: handler,
          isSseHandler: false,
          paramtypes: [],
          getParamsMetadata: sinon.stub().returns([]),
          httpStatusCode: 200,
          hasCustomHeaders: false,
          responseHeaders: [],
        } as any);
        sinon.stub(contextCreator, 'createGuardsFn').returns(null as any);
        sinon.stub(contextCreator, 'createPipesFn').returns(null as any);
        sinon
          .stub((contextCreator as any).interceptorsContextCreator, 'create')
          .returns([
            {
              // e.g. writing an audit log entry before passing the file on
              intercept: (_, next) =>
                next.handle().pipe(
                  concatMap(async file => {
                    holding();
                    await new Promise(() => {});
                    return file;
                  }),
                ),
            },
          ]);
        const proxy = contextCreator.create(
          {} as any,
          { apply: () => of(new StreamableFile(stream)) } as any,
          '',
          '',
          0,
        );

        const pending = proxy(request, response, sinon.stub());
        await held;
        request.socket.emit('close');
        await pending;

        expect(adapterReplySpy.called).to.be.false;
        expect(stream.destroyed).to.be.true;
      });
    });

    describe('when the adapter fails to send a StreamableFile', () => {
      it('should destroy its stream', async () => {
        sinon.stub(contextCreator, 'reflectRenderTemplate').returns(undefined!);
        sinon.stub(contextCreator, 'reflectSse').returns(undefined!);
        const handler = contextCreator.createHandleResponseFn(
          null!,
          false,
          undefined,
          200,
        ) as HandlerResponseBasicFn;
        // e.g. a header value Node.js rejects
        const error = new TypeError('Invalid character in header content');
        sinon.stub(adapter, 'reply').throws(error);
        const stream = new PassThrough();

        try {
          await handler(new StreamableFile(stream), {});
          expect.fail('should have thrown');
        } catch (err) {
          expect(err).to.equal(error);
        }
        expect(stream.destroyed).to.be.true;
      });
    });

    describe('when "isSse" is enabled', () => {
      it('should delegate result to SseStream', async () => {
        const result = of('test');
        const response = new PassThrough();
        response.write = sinon.spy();

        const request = attachSocket(new PassThrough());
        request.socket.once = sinon.spy(
          request.socket.once.bind(request.socket),
        );

        sinon.stub(contextCreator, 'reflectRenderTemplate').returns(undefined!);
        sinon.stub(contextCreator, 'reflectSse').returns('/');

        const handler = contextCreator.createHandleResponseFn(
          null!,
          true,
          undefined,
          200,
        ) as HandlerResponseBasicFn;
        await handler(result, response, request);

        expect((response.write as any).called).to.be.true;
        expect((request.socket.once as any).calledWith('close')).to.be.true;
      });

      it('should not allow a non-observable result', async () => {
        const result = Promise.resolve('test');
        const response = new PassThrough();
        const request = new PassThrough();

        sinon.stub(contextCreator, 'reflectRenderTemplate').returns(undefined!);
        sinon.stub(contextCreator, 'reflectSse').returns('/');

        const handler = contextCreator.createHandleResponseFn(
          null!,
          true,
          undefined,
          200,
        ) as HandlerResponseBasicFn;

        try {
          await handler(result, response, request);
        } catch (e) {
          expect(e.message).to.equal(
            'You must return an Observable stream to use Server-Sent Events (SSE).',
          );
        }
      });

      it('should apply any headers that exists on the response', async () => {
        const result = of('test');
        const response = new PassThrough() as HeaderStream;
        response.write = sinon.spy();
        response.writeHead = sinon.spy();
        response.flushHeaders = sinon.spy();
        response.getHeaders = sinon
          .stub()
          .returns({ 'access-control-headers': 'some-cors-value' });

        const request = attachSocket(new PassThrough());

        sinon.stub(contextCreator, 'reflectRenderTemplate').returns(undefined!);
        sinon.stub(contextCreator, 'reflectSse').returns('/');

        const handler = contextCreator.createHandleResponseFn(
          null!,
          true,
          undefined,
          200,
        ) as HandlerResponseBasicFn;
        await handler(result, response, request);

        expect(
          (response.writeHead as sinon.SinonSpy).calledWith(
            200,
            sinon.match.hasNested('access-control-headers', 'some-cors-value'),
          ),
        ).to.be.true;
      });

      it('should pass through status and headers from the wrapper response at handle time', async () => {
        const rawResponse = new PassThrough() as HeaderStream;
        rawResponse.write = sinon.spy();
        rawResponse.writeHead = sinon.spy();
        rawResponse.flushHeaders = sinon.spy();

        const response = {
          raw: rawResponse,
          statusCode: 203,
          getHeaders: sinon
            .stub()
            .returns({ 'access-control-headers': 'at-handle-time' }),
        };
        const result = of('test');

        const request = attachSocket(new PassThrough());

        sinon.stub(contextCreator, 'reflectRenderTemplate').returns(undefined!);
        sinon.stub(contextCreator, 'reflectSse').returns('/');

        const handler = contextCreator.createHandleResponseFn(
          null!,
          true,
          undefined,
          200,
        ) as HandlerResponseBasicFn;
        await handler(result, response as any, request);

        expect(
          (rawResponse.writeHead as sinon.SinonSpy).calledWith(
            203,
            sinon.match.hasNested('access-control-headers', 'at-handle-time'),
          ),
        ).to.be.true;
      });
    });
  });
});
