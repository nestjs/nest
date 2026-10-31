import { of } from 'rxjs';
import { PassThrough } from 'stream';
import { Sse } from '../../../common/decorators/http/sse.decorator.js';
import { ApplicationConfig } from '../../application-config.js';
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
import { NoopHttpAdapter } from '../utils/noop-adapter.js';

// `@nestjs/common` exports SSE_OPTIONS_METADATA since 12.2.0, while this
// package supports `@nestjs/common` ^12.0.0. Mock it as an older one.
vi.mock('../../../common/internal.js', async importOriginal => {
  const { SSE_OPTIONS_METADATA, ...internal } =
    await importOriginal<typeof import('@nestjs/common/internal')>();
  return internal;
});

describe('RouterExecutionContext with an @nestjs/common older than 12.2.0', () => {
  it('should hand an SSE route to the SSE response with the default limit', async () => {
    class TestController {
      @Sse('events')
      events() {}
    }
    const contextCreator = new RouterExecutionContext(
      new RouteParamsFactory(),
      new PipesContextCreator(new NestContainer(), new ApplicationConfig()),
      new PipesConsumer(),
      new GuardsContextCreator(new NestContainer()),
      new GuardsConsumer(),
      new InterceptorsContextCreator(new NestContainer()),
      new InterceptorsConsumer(),
      new NoopHttpAdapter({}),
    );
    const sse = vi
      .spyOn(contextCreator['responseController'], 'sse')
      .mockResolvedValue(undefined);
    const result = of('test');
    const response = new PassThrough();
    const request = new PassThrough();

    const handler = contextCreator.createHandleResponseFn(
      TestController.prototype.events,
      true,
    ) as HandlerResponseBasicFn;
    await handler(result, response, request);

    expect(sse).toHaveBeenCalledWith(
      result,
      response,
      request,
      expect.objectContaining({ maxPendingDataLength: undefined }),
    );
  });
});
