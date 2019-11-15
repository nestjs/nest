import {
  INestApplication,
  HttpServer,
  Injectable,
  CallHandler,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { RENDER_METADATA } from '@nestjs/common/constants';
import {
  ExpressAdapter,
  NestExpressApplication,
} from '@nestjs/platform-express';
import { Test } from '@nestjs/testing';
import * as express from 'express';
import * as request from 'supertest';
import { ApplicationModule } from '../src/app.module';
import { join } from 'path';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { expect } from 'chai';
// Ensure get HttpAdapterHost from core and not common
import { APP_INTERCEPTOR, HttpAdapterHost } from '@nestjs/core';
import { RenderInterceptorExecutionContext } from '@nestjs/common/interfaces/features/render-interceptor_execution_context.interface';
import { map } from 'rxjs/operators';

const contentTypeHtml = 'text/html; charset=utf-8';
const viewsDirectory = join(__dirname, '..', 'views');
const mvcUrl = '/hello/mvc';

@Injectable()
export class RenderInterceptor {
  renderIntercept(
    context: RenderInterceptorExecutionContext,
    next: CallHandler<string>,
  ) {
    return next
      .handle()
      .pipe(map(rendered => rendered.replace('world', 'intercepted world')));
  }
}

@Injectable()
export class HandlerInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler<{ helloGreeting: string }>,
  ) {
    return next.handle().pipe(
      map(rendered => ({
        helloGreeting: rendered.helloGreeting.replace('Hello', 'Hi'),
      })),
    );
  }
}

@Injectable()
export class SkipRenderInterceptor {
  @Inject('HttpAdapterHost')
  private readonly httpAdapterHost: HttpAdapterHost;
  rendered = true;
  intercept(
    context: ExecutionContext,
    next: CallHandler<{ helloGreeting: string }>,
    didRender: { rendered: boolean },
  ) {
    didRender.rendered = true;
    const view: string = Reflect.getMetadata(
      RENDER_METADATA,
      context.getHandler(),
    );
    const v2View = `v2/${view}`;
    const httpAdapter = this.httpAdapterHost.httpAdapter as
      | ExpressAdapter
      | FastifyAdapter;
    return next
      .handle()
      .pipe(map(rendered => httpAdapter.renderToString!(v2View, rendered)));
  }
}

interface TestsAdapter<T extends INestApplication> {
  app: T;
  createServer(): HttpServer;
  initializeApp(app: T): void;
  isExpress: boolean;
  expectRequest(expectedPayload: string): Promise<void>;
}

class ExpressTests implements TestsAdapter<NestExpressApplication> {
  app: NestExpressApplication;
  isExpress = true;
  server: any;
  createServer() {
    return new ExpressAdapter(express());
  }
  initializeApp(app) {
    app.setBaseViewsDir(viewsDirectory);
    app.setViewEngine('hbs');
    this.server = app.getHttpServer();
  }
  expectRequest(expectedPayload: string) {
    return request(this.server)
      .get(mvcUrl)
      .expect(200)
      .expect('content-type', contentTypeHtml)
      .expect(expectedPayload);
  }
}

class FastifyTests implements TestsAdapter<NestFastifyApplication> {
  app: NestFastifyApplication;
  isExpress = false;
  server: any;
  createServer() {
    return new FastifyAdapter();
  }
  initializeApp(app) {
    app.setViewEngine({
      engine: {
        handlebars: require('handlebars'),
      },
      templates: viewsDirectory,
    });
  }
  async expectRequest(payload: string) {
    const result = await this.app.inject({
      method: 'GET',
      url: mvcUrl,
    });

    expect(result.statusCode).to.be.eq(200);
    expect(result.payload).to.be.eql(payload);
    expect(result.headers['content-type']).to.be.eql(contentTypeHtml);
  }
}

const testAdapters: TestsAdapter<any>[] = [
  new ExpressTests(),
  new FastifyTests(),
];
testAdapters.forEach(testsAndSetup => {
  describe(`Rendering with ${
    testsAndSetup.isExpress ? 'express' : 'fastify'
  }`, () => {
    let app: INestApplication;

    function createTestModule(
      interceptorOrInterceptors?: any | any[],
      isClass = false,
    ) {
      const interceptors: any[] = Array.isArray(interceptorOrInterceptors)
        ? interceptorOrInterceptors
        : interceptorOrInterceptors === undefined
        ? []
        : [interceptorOrInterceptors];
      const providers = interceptors.map(interceptor =>
        isClass
          ? {
              provide: APP_INTERCEPTOR,
              useClass: interceptor,
            }
          : {
              provide: APP_INTERCEPTOR,
              useValue: interceptor,
            },
      );
      return Test.createTestingModule({
        imports: [ApplicationModule],
        providers,
      }).compile();
    }
    async function setUpTest(
      interceptorOrInterceptors?: any | any[],
      isClass = false,
    ) {
      const module = await createTestModule(interceptorOrInterceptors, isClass);
      app = module.createNestApplication(testsAndSetup.createServer());
      testsAndSetup.initializeApp(app);
      testsAndSetup.app = app;

      await app.init();
    }

    it(`should use the view engine`, async () => {
      await setUpTest();
      await testsAndSetup.expectRequest('<div>Hello world!</div>');
    });

    it('should be able to render intercept', async () => {
      await setUpTest(new RenderInterceptor());
      await testsAndSetup.expectRequest('<div>Hello intercepted world!</div>');
    });

    it('should be able to handler intercept and then render intercept', async () => {
      await setUpTest([new HandlerInterceptor(), new RenderInterceptor()]);
      await testsAndSetup.expectRequest('<div>Hi intercepted world!</div>');
    });

    it('should be able to skip render', async () => {
      await setUpTest(SkipRenderInterceptor, true);
      await testsAndSetup.expectRequest('<span>Hello world!</span>');
    });

    it('should be able to skip render and then render intercept', async () => {
      await setUpTest([SkipRenderInterceptor, RenderInterceptor], true);
      await testsAndSetup.expectRequest(
        '<span>Hello intercepted world!</span>',
      );
    });

    afterEach(async () => {
      await app.close();
    });
  });
});
