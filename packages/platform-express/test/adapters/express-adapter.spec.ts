import { RequestMethod, StreamableFile } from '@nestjs/common';
import { ExpressAdapter } from '@nestjs/platform-express';
import { expect } from 'chai';
import * as express from 'express';
import * as sinon from 'sinon';
import { PassThrough } from 'stream';

describe('ExpressAdapter', () => {
  afterEach(() => sinon.restore());

  describe('reply', () => {
    let expressAdapter: ExpressAdapter;

    const createResponse = () => ({
      status: sinon.stub(),
      send: sinon.stub(),
      json: sinon.stub(),
      getHeader: sinon.stub(),
      setHeader: sinon.stub(),
    });

    beforeEach(() => {
      expressAdapter = new ExpressAdapter(express());
    });

    it('should force a JSON content type for error bodies sent with a non-JSON content type', () => {
      const response = createResponse();
      response.getHeader.returns('text/html');
      sinon.stub((expressAdapter as any).logger, 'warn');

      expressAdapter.reply(response, { statusCode: 400, message: 'Oops' }, 400);

      expect(response.setHeader.calledWith('Content-Type', 'application/json'))
        .to.be.true;
    });

    it('should force a JSON content type for error bodies without a "statusCode"', () => {
      const response = createResponse();
      response.getHeader.returns('text/html');
      const warnStub = sinon.stub((expressAdapter as any).logger, 'warn');
      // A custom HttpException body, e.g. new HttpException({ ... }, 404)
      const body = { status: 404, error: '<img src=x onerror=alert(1)>' };

      expressAdapter.reply(response, body, 404);

      expect(response.setHeader.calledWith('Content-Type', 'application/json'))
        .to.be.true;
      expect(warnStub.called).to.be.true;
      expect(response.json.calledWith(body)).to.be.true;
    });

    it('should keep the content type of a text body sent with an error status', () => {
      const response = createResponse();
      response.getHeader.returns('text/html');

      expressAdapter.reply(response, '<h1>Not found</h1>', 404);

      expect(response.setHeader.called).to.be.false;
      expect(response.send.calledWith('<h1>Not found</h1>')).to.be.true;
    });

    describe('when the body is a StreamableFile', () => {
      const createStreamResponse = () =>
        Object.assign(new PassThrough(), {
          getHeader: sinon.stub(),
          setHeader: sinon.stub(),
        });

      const waitFor = async (condition: () => boolean) => {
        for (let i = 0; i < 100 && !condition(); i++) {
          await new Promise(resolve => setTimeout(resolve, 5));
        }
      };

      it('should destroy the source stream when the client disconnects', async () => {
        const source = new PassThrough();
        const errorHandler = sinon.stub();
        const errorLogger = sinon.stub();
        const file = new StreamableFile(source)
          .setErrorHandler(errorHandler)
          .setErrorLogger(errorLogger);
        const response = createStreamResponse();

        expressAdapter.reply(response, file);
        source.write('partial');
        response.destroy();

        await waitFor(() => source.destroyed);
        expect(source.destroyed).to.be.true;
        expect(errorHandler.called).to.be.false;
        expect(errorLogger.called).to.be.false;
      });

      it('should destroy the source stream when the client disconnected before the reply', async () => {
        const source = new PassThrough();
        const response = createStreamResponse();
        response.destroy();
        await new Promise(resolve => setImmediate(resolve));

        expressAdapter.reply(response, new StreamableFile(source));

        await waitFor(() => source.destroyed);
        expect(source.destroyed).to.be.true;
      });

      it('should not destroy a source that has ended', async () => {
        const source = new PassThrough({ autoDestroy: false });
        const response = createStreamResponse();
        response.resume();

        expressAdapter.reply(response, new StreamableFile(source));
        source.end('done');
        await new Promise(resolve => response.once('end', resolve));
        await new Promise(resolve => setImmediate(resolve));

        expect(source.readableEnded).to.be.true;
        expect(source.destroyed).to.be.false;
      });

      it('should keep the source open while the response is being written', async () => {
        const source = new PassThrough();
        const response = createStreamResponse();
        const chunks: Buffer[] = [];
        response.on('data', chunk => chunks.push(chunk));

        expressAdapter.reply(response, new StreamableFile(source));
        source.write('first');
        await new Promise(resolve => setImmediate(resolve));

        expect(source.destroyed).to.be.false;
        source.end('second');
        await new Promise(resolve => response.once('end', resolve));
        expect(Buffer.concat(chunks).toString()).to.equal('firstsecond');
      });

      it('should report a source that failed before the reply to the error handler', async () => {
        // e.g. ENOENT from `fs.createReadStream()` while an interceptor awaits
        const source = new PassThrough();
        const errorHandler = sinon.stub();
        const file = new StreamableFile(source).setErrorHandler(errorHandler);
        const response = createStreamResponse();
        const error = new Error('ENOENT');
        source.destroy(error);
        await new Promise(resolve => setImmediate(resolve));

        expressAdapter.reply(response, file);

        expect(errorHandler.calledWith(error, response)).to.be.true;
        expect(response.setHeader.called).to.be.false;
      });
    });
  });

  describe('registerParserMiddleware', () => {
    it('should register the express built-in parsers for json and urlencoded payloads', () => {
      const expressInstance = express();
      const jsonParserInstance = express.json();
      const urlencodedInstance = express.urlencoded();
      const jsonParserSpy = sinon
        .stub(express, 'json')
        .returns(jsonParserInstance);
      const urlencodedParserSpy = sinon
        .stub(express, 'urlencoded')
        .returns(urlencodedInstance);
      const useSpy = sinon.spy(expressInstance, 'use');
      const expressAdapter = new ExpressAdapter(expressInstance);
      useSpy.resetHistory();

      expressAdapter.registerParserMiddleware();

      expect(useSpy.calledTwice).to.be.true;
      expect(useSpy.calledWith(sinon.match.same(jsonParserInstance))).to.be
        .true;
      expect(useSpy.calledWith(sinon.match.same(urlencodedInstance))).to.be
        .true;
      expect(jsonParserSpy.calledOnceWith({})).to.be.true;
      expect(urlencodedParserSpy.calledOnceWith({ extended: true })).to.be.true;
    });

    it('should not register default parsers if custom parsers have already been registered', () => {
      const expressInstance = express();
      expressInstance.use(function jsonParser() {});
      expressInstance.use(function urlencodedParser() {});
      const useSpy = sinon.spy(expressInstance, 'use');
      const expressAdapter = new ExpressAdapter(expressInstance);
      useSpy.resetHistory();

      expressAdapter.registerParserMiddleware();

      expect(useSpy.called).to.be.false;
    });
  });

  describe('getRouteMatchingOptions', () => {
    it('should match paths case-insensitively and ignore a trailing slash by default', () => {
      expect(new ExpressAdapter().getRouteMatchingOptions()).to.deep.equal({
        caseSensitive: false,
        ignoreTrailingSlash: true,
      });
    });

    it('should follow the "case sensitive routing" and "strict routing" settings', () => {
      const app = express();
      app.set('case sensitive routing', true);
      app.set('strict routing', true);

      expect(new ExpressAdapter(app).getRouteMatchingOptions()).to.deep.equal({
        caseSensitive: true,
        ignoreTrailingSlash: false,
      });
    });

    it('should ignore settings changed after the router was created, as the router does', () => {
      const app = express();
      app.use((_req, _res, next) => next());
      app.set('case sensitive routing', true);
      app.set('strict routing', true);

      expect(new ExpressAdapter(app).getRouteMatchingOptions()).to.deep.equal({
        caseSensitive: false,
        ignoreTrailingSlash: true,
      });
    });
  });

  describe('createMiddlewareFactory', () => {
    // Plain-path routes such as forRoutes('*') carry no request method
    // (see RoutesMapper.getRouteInfoFromPath).
    const NO_REQUEST_METHOD = -1 as RequestMethod;
    let expressAdapter: ExpressAdapter;

    beforeEach(() => {
      expressAdapter = new ExpressAdapter();
    });

    for (const { method, path, expressMethod, registeredPath } of [
      {
        method: NO_REQUEST_METHOD,
        path: '/api$',
        expressMethod: 'all',
        registeredPath: '/api',
      },
      {
        method: NO_REQUEST_METHOD,
        path: '/api/v1$',
        expressMethod: 'all',
        registeredPath: '/api/v1',
      },
      {
        method: RequestMethod.GET,
        path: '/api$',
        expressMethod: 'get',
        registeredPath: '/api',
      },
    ] as const) {
      it(`should register the exact-match path ${path} through "${expressMethod}" at ${registeredPath}`, () => {
        const expressInstance = expressAdapter.getInstance();
        const routeSpy = sinon.spy(expressInstance, expressMethod);
        const useSpy = sinon.spy(expressInstance, 'use');
        const handler = sinon.spy();

        expressAdapter.createMiddlewareFactory(method)(path, handler);

        expect(routeSpy.calledOnce).to.be.true;
        expect(routeSpy.firstCall.args[0]).to.equal(registeredPath);
        expect(routeSpy.firstCall.args[1]).to.be.a('function');
        expect(useSpy.called).to.be.false;
      });
    }

    it('should register the middleware itself on the exact-match path', () => {
      const allSpy = sinon.spy(expressAdapter.getInstance(), 'all');
      const middleware = sinon.spy();

      expressAdapter.createMiddlewareFactory(NO_REQUEST_METHOD)(
        '/api$',
        middleware,
      );

      // "/api" also matches "/api/", which "/api/*path" would not
      expect(allSpy.calledOnceWithExactly('/api', middleware)).to.be.true;
    });
  });
});
