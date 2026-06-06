import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import * as sinon from 'sinon';

chai.use(chaiAsPromised);
import { Readable } from 'stream';
import {
  HttpStatus,
  Logger,
  RequestMethod,
  StreamableFile,
  VERSION_NEUTRAL,
  VersioningType,
} from '@nestjs/common';
import { FastifyAdapter } from '../../adapters/fastify-adapter';

describe('FastifyAdapter', () => {
  afterEach(() => sinon.restore());

  function createMockInstance() {
    return {
      server: {},
      addHook: sinon.stub(),
      listen: sinon.stub(),
      close: sinon.stub().resolves(),
      route: sinon.stub(),
      register: sinon.stub().resolves(),
      use: sinon.stub(),
      inject: sinon.stub(),
      supportedMethods: [
        'GET',
        'POST',
        'PUT',
        'PATCH',
        'DELETE',
        'HEAD',
        'OPTIONS',
        'SEARCH',
        'PROPFIND',
        'PROPPATCH',
        'MKCOL',
        'COPY',
        'MOVE',
        'LOCK',
        'UNLOCK',
      ],
      addHttpMethod: sinon.stub(),
      setErrorHandler: sinon.stub(),
      setNotFoundHandler: sinon.stub(),
      initialConfig: {
        bodyLimit: 1048576,
        ignoreDuplicateSlashes: false,
        ignoreTrailingSlash: false,
        caseSensitive: true,
        useSemicolonDelimiter: false,
        routerOptions: {},
      },
      getDefaultJsonParser: sinon
        .stub()
        .returns((_req: any, _body: any, done: (e: any, b?: any) => void) =>
          done(null, _body),
        ),
      addContentTypeParser: sinon.stub(),
    };
  }

  function createAdapter(instance?: any): FastifyAdapter {
    return new FastifyAdapter(instance || (createMockInstance() as any));
  }

  function mockReply() {
    return {
      status: sinon.stub().returnsThis(),
      send: sinon.stub(),
      header: sinon.stub().returnsThis(),
      getHeader: sinon.stub().returns(undefined),
      code: sinon.stub().returnsThis(),
      redirect: sinon.stub().returnsThis(),
      view: sinon.stub(),
      sent: false,
      raw: { end: sinon.stub() },
    };
  }

  function mockRequest() {
    return {
      hostname: 'example.com',
      method: 'GET',
      raw: {
        method: 'GET',
        originalUrl: '/test?q=1',
        url: '/test?q=1',
      },
    };
  }

  function getOnRequestHook(instance: any): Function {
    return instance.addHook.args.find((a: any[]) => a[0] === 'onRequest')?.[1];
  }

  function getOnResponseHook(instance: any): Function {
    return instance.addHook.args.find((a: any[]) => a[0] === 'onResponse')?.[1];
  }

  // ================================================================
  //  Constructor
  // ================================================================
  describe('constructor', () => {
    it('should use provided instance when argument has .server', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      expect(adapter.getInstance()).to.equal(instance);
    });

    it('should register onRequest and onResponse hooks', () => {
      const instance = createMockInstance();
      createAdapter(instance);
      expect(instance.addHook.calledWith('onRequest', sinon.match.func)).to.be
        .true;
      expect(instance.addHook.calledWith('onResponse', sinon.match.func)).to.be
        .true;
    });

    it('should call done() in onRequest hook when no custom hook set', () => {
      const instance = createMockInstance();
      createAdapter(instance);
      const hook = getOnRequestHook(instance);
      const done = sinon.spy();
      hook({}, {}, done);
      expect(done.calledOnce).to.be.true;
    });

    it('should call done() in onResponse hook when no custom hook set', () => {
      const instance = createMockInstance();
      createAdapter(instance);
      const hook = getOnResponseHook(instance);
      const done = sinon.spy();
      hook({}, {}, done);
      expect(done.calledOnce).to.be.true;
    });
  });

  // ================================================================
  //  getType
  // ================================================================
  describe('getType', () => {
    it('should return "fastify"', () => {
      expect(createAdapter().getType()).to.equal('fastify');
    });
  });

  // ================================================================
  //  Getters
  // ================================================================
  describe('getHttpServer / getInstance', () => {
    it('getHttpServer should return instance.server', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      expect(adapter.getHttpServer()).to.equal(instance.server);
    });

    it('getInstance should return the underlying instance', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      expect(adapter.getInstance()).to.equal(instance);
    });
  });

  // ================================================================
  //  initHttpServer
  // ================================================================
  describe('initHttpServer', () => {
    it('should set httpServer to instance.server', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      adapter.initHttpServer();
      expect(adapter.getHttpServer()).to.equal(instance.server);
    });
  });

  // ================================================================
  //  listen
  // ================================================================
  describe('listen', () => {
    it('should call instance.listen with port and callback', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      const cb = () => {};
      adapter.listen(3000, cb);
      expect(instance.listen.calledWith({ port: 3000 }, cb)).to.be.true;
    });

    it('should call instance.listen with port, hostname, and callback', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      const cb = () => {};
      adapter.listen(3000, '0.0.0.0', cb);
      expect(instance.listen.calledWith({ port: 3000, host: '0.0.0.0' }, cb)).to
        .be.true;
    });

    it('should call instance.listen with options object and callback', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      const cb = () => {};
      (adapter as any).listen({ port: 3000, host: '0.0.0.0' }, cb);
      expect(instance.listen.calledWith({ port: 3000, host: '0.0.0.0' }, cb)).to
        .be.true;
    });

    it('should call instance.listen with port only (host defaults to undefined)', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      adapter.listen(3000);
      expect(instance.listen.calledOnce).to.be.true;
      const options = instance.listen.firstCall.args[0];
      expect(options.port).to.equal(3000);
      expect(options.host).to.be.undefined;
    });
  });

  // ================================================================
  //  close
  // ================================================================
  describe('close', () => {
    it('should call instance.close()', async () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      await adapter.close();
      expect(instance.close.calledOnce).to.be.true;
    });

    it('should swallow ERR_SERVER_NOT_RUNNING error', async () => {
      const instance = createMockInstance();
      instance.close.rejects(
        Object.assign(new Error(), {
          code: 'ERR_SERVER_NOT_RUNNING',
        }),
      );
      const adapter = createAdapter(instance);
      await expect(adapter.close()).to.eventually.be.undefined;
    });

    it('should re-throw non-server-not-running errors', async () => {
      const instance = createMockInstance();
      instance.close.rejects(new Error('something else'));
      const adapter = createAdapter(instance);
      await expect(adapter.close()).to.be.rejectedWith('something else');
    });
  });

  // ================================================================
  //  init
  // ================================================================
  describe('init', () => {
    it('should register middie plugin when not already registered', async () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      await adapter.init();
      expect(instance.register.calledOnce).to.be.true;
    });

    it('should flush pending middlewares after registering middie', async () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      const middleware = sinon.spy();
      adapter.use('/path', middleware);
      expect(instance.use.called).to.be.false;
      await adapter.init();
      expect(instance.use.calledWith('/path', middleware)).to.be.true;
    });

    it('should not re-register middie if skipMiddie was set', async () => {
      const instance = createMockInstance();
      const skipAdapter = new FastifyAdapter({
        ...instance,
        skipMiddie: true,
      } as any);
      await skipAdapter.init();
      expect(instance.register.called).to.be.false;
    });
  });

  // ================================================================
  //  HTTP route methods
  // ================================================================
  describe('HTTP route methods', () => {
    const METHODS = [
      'get',
      'post',
      'put',
      'patch',
      'delete',
      'options',
      'head',
      'search',
      'propfind',
      'proppatch',
      'mkcol',
      'copy',
      'move',
      'lock',
      'unlock',
    ] as const;

    METHODS.forEach(method => {
      it(`${method} should register a route via instance.route`, () => {
        const instance = createMockInstance();
        const adapter = createAdapter(instance);
        const handler = () => {};
        (adapter as any)[method]('/path', handler);
        expect(instance.route.calledOnce).to.be.true;
        const routeArg = instance.route.firstCall.args[0];
        expect(routeArg.method).to.equal(method.toUpperCase());
        expect(routeArg.url).to.equal('/path');
        expect(routeArg.handler).to.equal(handler);
      });
    });

    it('should call addHttpMethod for unsupported HTTP methods', () => {
      const instance = createMockInstance();
      instance.supportedMethods = ['GET'];
      const adapter = createAdapter(instance);
      (adapter as any).post('/path', () => {});
      expect(instance.addHttpMethod.calledWith('POST', { hasBody: true })).to.be
        .true;
    });

    it('should add version constraint when handler has version', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      const handler = () => {};
      adapter.applyVersionFilter(handler, '1', {
        type: VersioningType.URI,
      } as any);
      (adapter as any).get('/path', handler);
      const routeArg = instance.route.firstCall.args[0];
      expect(routeArg.constraints.version).to.equal('1');
    });

    it('should add config metadata when present on handler', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      const handler = () => {};
      const routeConfig = { some: 'config' };
      Reflect.defineMetadata('__fastify_route_config__', routeConfig, handler);
      (adapter as any).get('/path', handler);
      const routeArg = instance.route.firstCall.args[0];
      expect(routeArg.config).to.deep.equal(routeConfig);
    });

    it('should add constraints metadata when present on handler', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      const handler = () => {};
      const routeConstraints = { some: 'constraint' };
      Reflect.defineMetadata(
        '__fastify_route_constraints__',
        routeConstraints,
        handler,
      );
      (adapter as any).get('/path', handler);
      const routeArg = instance.route.firstCall.args[0];
      expect(routeArg.constraints.some).to.equal('constraint');
    });

    it('should add schema metadata when present on handler', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      const handler = () => {};
      const routeSchema = { body: { type: 'object' } };
      Reflect.defineMetadata('__fastify_route_schema__', routeSchema, handler);
      (adapter as any).get('/path', handler);
      const routeArg = instance.route.firstCall.args[0];
      expect(routeArg.schema).to.deep.equal(routeSchema);
    });
  });

  // ================================================================
  //  applyVersionFilter
  // ================================================================
  describe('applyVersionFilter', () => {
    it('should set version on the handler function', () => {
      const adapter = createAdapter();
      const handler = () => {};
      adapter.applyVersionFilter(handler, '1', {
        type: VersioningType.URI,
      } as any);
      expect((handler as any).version).to.equal('1');
    });

    it('should set versioningOptions on the adapter', () => {
      const adapter = createAdapter();
      const handler = () => {};
      const opts = { type: VersioningType.URI } as any;
      adapter.applyVersionFilter(handler, '1', opts);
      expect((adapter as any).versioningOptions).to.equal(opts);
    });
  });

  // ================================================================
  //  Version constraint
  // ================================================================
  describe('version constraint', () => {
    function getConstraint(adapter: FastifyAdapter) {
      return (adapter as any).versionConstraint;
    }

    describe('validate', () => {
      it('should accept a string', () => {
        const adapter = createAdapter();
        expect(() => getConstraint(adapter).validate('1')).not.to.throw();
      });

      it('should accept an array of strings', () => {
        const adapter = createAdapter();
        expect(() =>
          getConstraint(adapter).validate(['1', '2']),
        ).not.to.throw();
      });

      it('should reject a number', () => {
        const adapter = createAdapter();
        expect(() => getConstraint(adapter).validate(123)).to.throw(
          'Version constraint should be a string or an array of strings.',
        );
      });
    });

    describe('storage', () => {
      it('should support set, get, del, empty operations', () => {
        const adapter = createAdapter();
        const storage = getConstraint(adapter).storage();
        storage.set('1', { value: 'v1' });
        expect(storage.get('1')).to.deep.equal({ value: 'v1' });
        storage.del('1');
        expect(storage.get('1')).to.be.null;
      });

      it('should set and get by array of versions', () => {
        const adapter = createAdapter();
        const storage = getConstraint(adapter).storage();
        storage.set(['1', '2'], { value: 'v1' });
        expect(storage.get('1')).to.deep.equal({ value: 'v1' });
        expect(storage.get('2')).to.deep.equal({ value: 'v1' });
      });

      it('should delete by array of versions', () => {
        const adapter = createAdapter();
        const storage = getConstraint(adapter).storage();
        storage.set('1', {});
        storage.set('2', {});
        storage.del(['1', '2']);
        expect(storage.get('1')).to.be.null;
        expect(storage.get('2')).to.be.null;
      });

      it('should clear all versions with empty()', () => {
        const adapter = createAdapter();
        const storage = getConstraint(adapter).storage();
        storage.set('1', {});
        storage.set('2', {});
        storage.empty();
        expect(storage.get('1')).to.be.null;
        expect(storage.get('2')).to.be.null;
      });
    });

    describe('deriveConstraint', () => {
      it('should return undefined when versioningOptions is not set', () => {
        const adapter = createAdapter();
        const req = { headers: {} };
        const result = getConstraint(adapter).deriveConstraint(req);
        expect(result).to.be.undefined;
      });

      it('should derive from Accept header for MEDIA_TYPE versioning', () => {
        const adapter = createAdapter();
        (adapter as any).versioningOptions = {
          type: VersioningType.MEDIA_TYPE,
          key: 'v=',
        };
        const req = { headers: { accept: 'application/json;v=1' } };
        const result = getConstraint(adapter).deriveConstraint(req);
        expect(result).to.equal('1');
      });

      it('should return undefined when no Accept header for MEDIA_TYPE', () => {
        const adapter = createAdapter();
        (adapter as any).versioningOptions = {
          type: VersioningType.MEDIA_TYPE,
          key: 'v=',
        };
        const req = { headers: {} };
        const result = getConstraint(adapter).deriveConstraint(req);
        expect(result).to.be.undefined;
      });

      it('should derive from custom header for HEADER versioning', () => {
        const adapter = createAdapter();
        (adapter as any).versioningOptions = {
          type: VersioningType.HEADER,
          header: 'x-api-version',
        };
        const req = { headers: { 'x-api-version': '2' } };
        const result = getConstraint(adapter).deriveConstraint(req);
        expect(result).to.equal('2');
      });

      it('should return VERSION_NEUTRAL when header missing for HEADER versioning', () => {
        const adapter = createAdapter();
        (adapter as any).versioningOptions = {
          type: VersioningType.HEADER,
          header: 'x-api-version',
        };
        const req = { headers: {} };
        const result = getConstraint(adapter).deriveConstraint(req);
        expect(result).to.equal(VERSION_NEUTRAL);
      });

      it('should call custom extractor for CUSTOM versioning', () => {
        const adapter = createAdapter();
        const extractor = sinon.stub().returns('custom-version');
        (adapter as any).versioningOptions = {
          type: VersioningType.CUSTOM,
          extractor,
        };
        const req = { headers: {} };
        const result = getConstraint(adapter).deriveConstraint(req);
        expect(result).to.equal('custom-version');
        expect(extractor.calledWith(req)).to.be.true;
      });
    });

    it('should have mustMatchWhenDerived set to false', () => {
      const adapter = createAdapter();
      expect(getConstraint(adapter).mustMatchWhenDerived).to.be.false;
    });
  });

  // ================================================================
  //  reply
  // ================================================================
  describe('reply', () => {
    it('should set status and send body when Fastify Reply is used', () => {
      const adapter = createAdapter();
      const reply = mockReply();
      adapter.reply(reply as any, { data: 'test' }, 201);
      expect(reply.status.calledWith(201)).to.be.true;
      expect(reply.send.calledWith({ data: 'test' })).to.be.true;
    });

    it('should send body without status when not provided', () => {
      const adapter = createAdapter();
      const reply = mockReply();
      adapter.reply(reply as any, 'hello');
      expect(reply.status.called).to.be.false;
      expect(reply.send.calledWith('hello')).to.be.true;
    });

    it('should reply with 200 status', () => {
      const adapter = createAdapter();
      const reply = mockReply();
      adapter.reply(reply as any, 'ok', 200);
      expect(reply.status.calledWith(200)).to.be.true;
    });

    it('should set stream headers from StreamableFile', () => {
      const adapter = createAdapter();
      const reply = mockReply();
      const stream = new Readable({ read() {} });
      const streamableFile = new StreamableFile(stream, {
        type: 'text/plain',
        disposition: 'attachment; filename="test.txt"',
        length: 100,
      });
      adapter.reply(reply as any, streamableFile);
      expect(reply.header.calledWith('Content-Type', 'text/plain')).to.be.true;
      expect(
        reply.header.calledWith(
          'Content-Disposition',
          'attachment; filename="test.txt"',
        ),
      ).to.be.true;
      expect(reply.header.calledWith('Content-Length', 100)).to.be.true;
      expect(reply.send.called).to.be.true;
    });

    it('should not overwrite existing Content-Type from StreamableFile', () => {
      const adapter = createAdapter();
      const reply = mockReply();
      reply.getHeader.returns('application/json');
      const stream = new Readable({ read() {} });
      const streamableFile = new StreamableFile(stream, {
        type: 'text/plain',
      });
      adapter.reply(reply as any, streamableFile);
      expect(reply.header.calledWith('Content-Type')).to.be.false;
    });

    it('should set default application/octet-stream Content-Type when StreamableFile has no explicit type', () => {
      const adapter = createAdapter();
      const reply = mockReply();
      const stream = new Readable({ read() {} });
      const streamableFile = new StreamableFile(stream);
      adapter.reply(reply as any, streamableFile);
      expect(
        reply.header.calledWith('Content-Type', 'application/octet-stream'),
      ).to.be.true;
    });

    it('should warn and override Content-Type on status >= 400 mismatch', () => {
      const warnStub = sinon.stub(Logger, 'warn');
      const adapter = createAdapter();
      const reply = mockReply();
      reply.getHeader.returns('text/html');
      adapter.reply(reply as any, { statusCode: 400 }, 400);
      expect(warnStub.calledOnce).to.be.true;
      expect(reply.header.calledWith('Content-Type', 'application/json')).to.be
        .true;
    });

    it('should not warn when Content-Type is application/json on 4xx', () => {
      const warnStub = sinon.stub(Logger, 'warn');
      const adapter = createAdapter();
      const reply = mockReply();
      reply.getHeader.returns('application/json');
      adapter.reply(reply as any, { statusCode: 400 }, 400);
      expect(warnStub.called).to.be.false;
    });
  });

  // ================================================================
  //  status, end, render, redirect
  // ================================================================
  describe('status', () => {
    it('should set statusCode on native response', () => {
      const adapter = createAdapter();
      const nativeRes = { statusCode: 0 };
      adapter.status(nativeRes as any, 200);
      expect(nativeRes.statusCode).to.equal(200);
    });

    it('should call code() on Fastify Reply', () => {
      const adapter = createAdapter();
      const reply = mockReply();
      const result = adapter.status(reply as any, 404);
      expect(reply.code.calledWith(404)).to.be.true;
      expect(result).to.equal(reply);
    });
  });

  describe('end', () => {
    it('should call response.raw.end with message', () => {
      const adapter = createAdapter();
      const reply = mockReply();
      adapter.end(reply as any, 'done');
      expect(reply.raw.end.calledWith('done')).to.be.true;
    });
  });

  describe('render', () => {
    it('should call response.view with view and options', () => {
      const adapter = createAdapter();
      const reply = mockReply();
      adapter.render(reply as any, 'index', { key: 'val' });
      expect(reply.view.calledWith('index', { key: 'val' })).to.be.true;
    });
  });

  describe('redirect', () => {
    it('should call response.status().redirect()', () => {
      const adapter = createAdapter();
      const reply = mockReply();
      adapter.redirect(reply as any, 302, '/new-location');
      expect(reply.status.calledWith(302)).to.be.true;
      expect(reply.redirect.calledWith('/new-location')).to.be.true;
    });
  });

  // ================================================================
  //  Headers
  // ================================================================
  describe('isHeadersSent', () => {
    it('should return response.sent', () => {
      const adapter = createAdapter();
      const reply = mockReply();
      reply.sent = true;
      expect(adapter.isHeadersSent(reply as any)).to.be.true;
      reply.sent = false;
      expect(adapter.isHeadersSent(reply as any)).to.be.false;
    });
  });

  describe('getHeader', () => {
    it('should delegate to response.getHeader', () => {
      const adapter = createAdapter();
      const getHeader = sinon.stub().returns('value');
      const result = adapter.getHeader({ getHeader } as any, 'Content-Type');
      expect(getHeader.calledWith('Content-Type')).to.be.true;
      expect(result).to.equal('value');
    });
  });

  describe('setHeader', () => {
    it('should delegate to response.header', () => {
      const adapter = createAdapter();
      const reply = mockReply();
      adapter.setHeader(reply as any, 'X-Custom', 'val');
      expect(reply.header.calledWith('X-Custom', 'val')).to.be.true;
    });
  });

  describe('appendHeader', () => {
    it('should delegate to response.header', () => {
      const adapter = createAdapter();
      const reply = mockReply();
      adapter.appendHeader(reply as any, 'X-Custom', 'val');
      expect(reply.header.calledWith('X-Custom', 'val')).to.be.true;
    });
  });

  // ================================================================
  //  Request introspection
  // ================================================================
  describe('getRequestHostname', () => {
    it('should return request.hostname', () => {
      const adapter = createAdapter();
      const req = mockRequest();
      expect(adapter.getRequestHostname(req as any)).to.equal('example.com');
    });
  });

  describe('getRequestMethod', () => {
    it('should return method from raw when available', () => {
      const adapter = createAdapter();
      const req = mockRequest();
      req.raw.method = 'POST';
      expect(adapter.getRequestMethod(req as any)).to.equal('POST');
    });

    it('should fall back to request.method when raw is absent', () => {
      const adapter = createAdapter();
      const req = { method: 'DELETE' };
      expect(adapter.getRequestMethod(req as any)).to.equal('DELETE');
    });
  });

  describe('getRequestUrl', () => {
    it('should use originalUrl from raw request', () => {
      const adapter = createAdapter();
      const req = mockRequest();
      expect(adapter.getRequestUrl(req as any)).to.equal('/test?q=1');
    });

    it('should fall back to url when originalUrl is absent', () => {
      const adapter = createAdapter();
      const req = {
        raw: { url: '/fallback' },
      };
      expect(adapter.getRequestUrl(req as any)).to.equal('/fallback');
    });
  });

  // ================================================================
  //  setOnRequestHook / setOnResponseHook
  // ================================================================
  describe('setOnRequestHook / setOnResponseHook', () => {
    it('should call custom hook when onRequest hook fires', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      const hook = sinon.spy();
      adapter.setOnRequestHook(hook);
      const onRequest = getOnRequestHook(instance);
      const done = sinon.spy();
      onRequest('req', 'reply', done);
      expect(hook.calledWith('req', 'reply', done)).to.be.true;
    });

    it('should call custom hook when onResponse hook fires', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      const hook = sinon.spy();
      adapter.setOnResponseHook(hook);
      const onResponse = getOnResponseHook(instance);
      const done = sinon.spy();
      onResponse('req', 'reply', done);
      expect(hook.calledWith('req', 'reply', done)).to.be.true;
    });
  });

  // ================================================================
  //  register & registerWithPrefix
  // ================================================================
  describe('register', () => {
    it('should delegate to instance.register with plugin and opts', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      const plugin = () => {};
      adapter.register(plugin, { prefix: '/api' });
      expect(instance.register.calledWith(plugin, { prefix: '/api' })).to.be
        .true;
    });

    it('should delegate to instance.register with plugin only', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      const plugin = () => {};
      adapter.register(plugin);
      expect(instance.register.calledWith(plugin, undefined)).to.be.true;
    });
  });

  describe('registerWithPrefix', () => {
    it('should call instance.register with factory and prefix', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      const factory = () => {};
      (adapter as any).registerWithPrefix(factory, '/v1');
      expect(instance.register.calledWith(factory, { prefix: '/v1' })).to.be
        .true;
    });

    it('should use default prefix "/"', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      const factory = () => {};
      (adapter as any).registerWithPrefix(factory);
      expect(instance.register.calledWith(factory, { prefix: '/' })).to.be.true;
    });
  });

  // ================================================================
  //  inject
  // ================================================================
  describe('inject', () => {
    it('should delegate to instance.inject with options', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      const opts = { method: 'GET', url: '/' };
      void adapter.inject(opts as any);
      expect(instance.inject.calledWith(opts)).to.be.true;
    });
  });

  // ================================================================
  //  setErrorHandler / setNotFoundHandler
  // ================================================================
  describe('setErrorHandler', () => {
    it('should delegate to instance.setErrorHandler', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      const handler = () => {};
      adapter.setErrorHandler(handler);
      expect(instance.setErrorHandler.calledWith(handler)).to.be.true;
    });
  });

  describe('setNotFoundHandler', () => {
    it('should delegate to instance.setNotFoundHandler', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      const handler = () => {};
      adapter.setNotFoundHandler(handler);
      expect(instance.setNotFoundHandler.calledWith(handler)).to.be.true;
    });
  });

  // ================================================================
  //  registerParserMiddleware
  // ================================================================
  describe('registerParserMiddleware', () => {
    it('should register JSON and urlencoded content parsers', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      adapter.registerParserMiddleware();
      expect(instance.addContentTypeParser.called).to.be.true;
      expect(instance.addContentTypeParser.calledWith('application/json')).to.be
        .true;
      expect(
        instance.addContentTypeParser.calledWith(
          'application/x-www-form-urlencoded',
        ),
      ).to.be.true;
    });

    it('should be idempotent when called twice', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      adapter.registerParserMiddleware();
      adapter.registerParserMiddleware();
      expect(instance.addContentTypeParser.callCount).to.equal(2);
    });

    it('should set path prefix with leading slash', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      adapter.registerParserMiddleware('api');
      expect((adapter as any)._pathPrefix).to.equal('/api');
    });

    it('should not double-slash the path prefix', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      adapter.registerParserMiddleware('/api');
      expect((adapter as any)._pathPrefix).to.equal('/api');
    });
  });

  // ================================================================
  //  useBodyParser
  // ================================================================
  describe('useBodyParser', () => {
    it('should register a custom content type parser', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      adapter.useBodyParser('text/plain', false);
      expect(instance.addContentTypeParser.calledWith('text/plain')).to.be.true;
    });

    it('should set rawBody on request when rawBody is true', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      adapter.useBodyParser('text/plain', true);
      const parserOpts = instance.addContentTypeParser.firstCall.args[1];
      expect(parserOpts.parseAs).to.equal('buffer');
    });

    it('should call custom parser function when provided', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      const customParser = sinon.spy();
      adapter.useBodyParser(
        'text/plain',
        false,
        undefined,
        customParser as any,
      );
      instance.addContentTypeParser.firstCall.args[2](
        { rawBody: undefined },
        Buffer.from('test'),
        () => {},
      );
      expect(customParser.calledOnce).to.be.true;
    });
  });

  // ================================================================
  //  enableCors
  // ================================================================
  describe('enableCors', () => {
    it('should call register with @fastify/cors import', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      adapter.enableCors();
      expect(instance.register.calledOnce).to.be.true;
    });

    it('should forward CORS options', () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      const opts = { origin: '*' };
      adapter.enableCors(opts as any);
      expect(instance.register.calledOnce).to.be.true;
    });
  });

  // ================================================================
  //  useStaticAssets
  // ================================================================
  describe('useStaticAssets', () => {
    it('should call register with @fastify/static plugin', () => {
      const adapter = createAdapter();
      const registerStub = sinon.stub(adapter, 'register' as any).returns({
        then: (cb: Function) => cb(),
      } as any);
      (adapter as any).useStaticAssets({ root: './public' });
      expect(registerStub.calledOnce).to.be.true;
    });
  });

  // ================================================================
  //  setViewEngine
  // ================================================================
  describe('setViewEngine', () => {
    it('should call register with @fastify/view plugin', () => {
      const adapter = createAdapter();
      const registerStub = sinon.stub(adapter, 'register' as any).returns({
        then: (cb: Function) => cb(),
      } as any);
      (adapter as any).setViewEngine({ engine: { renderFile: () => {} } });
      expect(registerStub.calledOnce).to.be.true;
    });

    it('should log error and exit when given a string', () => {
      const errorSpy = sinon.spy();
      const exitSpy = sinon.spy();
      const originalExit = process.exit;
      sinon.stub(Logger.prototype, 'error').callsFake(errorSpy);
      (process as any).exit = exitSpy;
      try {
        const adapter = createAdapter();
        (adapter as any).setViewEngine('ejs');
        expect(errorSpy.calledOnce).to.be.true;
        expect(exitSpy.calledWith(1)).to.be.true;
      } finally {
        (process as any).exit = originalExit;
      }
    });
  });

  // ================================================================
  //  isParserRegistered
  // ================================================================
  describe('isParserRegistered', () => {
    it('should return false by default', () => {
      const adapter = createAdapter();
      expect(adapter.isParserRegistered).to.be.false;
    });

    it('should return true after registerParserMiddleware', () => {
      const adapter = createAdapter();
      adapter.registerParserMiddleware();
      expect(adapter.isParserRegistered).to.be.true;
    });
  });

  // ================================================================
  //  use (middleware)
  // ================================================================
  describe('use', () => {
    it('should queue middleware when middie is not registered', () => {
      const adapter = createAdapter();
      const fn = () => {};
      const result = adapter.use('/path', fn);
      expect(result).to.equal(adapter);
      expect((adapter as any).pendingMiddlewares).to.have.lengthOf(1);
      expect((adapter as any).pendingMiddlewares[0].args).to.deep.equal([
        '/path',
        fn,
      ]);
    });

    it('should delegate to instance.use when middie is registered', async () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      await adapter.init();
      const fn = () => {};
      adapter.use('/path', fn);
      expect(instance.use.calledWith('/path', fn)).to.be.true;
    });
  });

  // ================================================================
  //  createMiddlewareFactory
  // ================================================================
  describe('createMiddlewareFactory', () => {
    it('should register middie if not already registered', async () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      await adapter.createMiddlewareFactory(RequestMethod.GET);
      expect(instance.register.called).to.be.true;
    });

    it('should return a factory function', async () => {
      const adapter = createAdapter();
      const factory = await adapter.createMiddlewareFactory(RequestMethod.GET);
      expect(factory).to.be.a('function');
    });

    it('should register middleware on instance.use from factory', async () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      (adapter as any).isMiddieRegistered = true;
      const factory = await adapter.createMiddlewareFactory(RequestMethod.GET);
      const callback = sinon.spy();
      factory('/test', callback);
      expect(instance.use.calledOnce).to.be.true;
      expect(instance.use.firstCall.args[0]).to.equal('/test');
    });

    it('should strip $ end-of-string character from path', async () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      (adapter as any).isMiddieRegistered = true;
      const factory = await adapter.createMiddlewareFactory(RequestMethod.GET);
      factory('/test$', () => {});
      expect(instance.use.firstCall.args[0]).to.equal('/test');
    });

    it('should invoke callback when middleware path matches', async () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      (adapter as any).isMiddieRegistered = true;
      const factory = await adapter.createMiddlewareFactory(RequestMethod.GET);
      const callback = sinon.spy();
      factory('/test', callback);
      const middlewareFn = instance.use.firstCall.args[1];
      const req = { originalUrl: '/test?q=1' };
      const next = sinon.spy();
      middlewareFn(req, {}, next);
      expect(callback.calledWith(req, {}, next)).to.be.true;
    });

    it('should skip when middleware path does not match', async () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      (adapter as any).isMiddieRegistered = true;
      const factory = await adapter.createMiddlewareFactory(RequestMethod.GET);
      const callback = sinon.spy();
      factory('/other', callback);
      const middlewareFn = instance.use.firstCall.args[1];
      const req = { originalUrl: '/test' };
      const next = sinon.spy();
      middlewareFn(req, {}, next);
      expect(next.calledOnce).to.be.true;
      expect(callback.called).to.be.false;
    });

    it('should fall back to *path when normalized path is /*path', async () => {
      const instance = createMockInstance();
      const adapter = createAdapter(instance);
      (adapter as any).isMiddieRegistered = true;
      const factory = await adapter.createMiddlewareFactory(RequestMethod.GET);
      factory('/*path', () => {});
      expect(instance.use.firstCall.args[0]).to.equal('*path');
    });
  });

  // ================================================================
  //  URL sanitization (private, tested via direct access)
  // ================================================================
  describe('URL sanitization', () => {
    function setConfig(
      adapter: FastifyAdapter,
      overrides: Record<string, any>,
    ) {
      Object.assign((adapter as any).instance.initialConfig, overrides);
      if (overrides.routerOptions) {
        (adapter as any).instance.initialConfig.routerOptions = {
          ...(adapter as any).instance.initialConfig.routerOptions,
          ...overrides.routerOptions,
        };
      }
    }

    describe('sanitizeUrl', () => {
      it('should remove duplicate slashes when ignoreDuplicateSlashes is true', () => {
        const adapter = createAdapter();
        setConfig(adapter, { ignoreDuplicateSlashes: true });
        const result = (adapter as any).sanitizeUrl('//foo//bar');
        expect(result).to.equal('/foo/bar');
      });

      it('should trim trailing slash when ignoreTrailingSlash is true', () => {
        const adapter = createAdapter();
        setConfig(adapter, { ignoreTrailingSlash: true });
        const result = (adapter as any).sanitizeUrl('/foo/');
        expect(result).to.equal('/foo');
      });

      it('should lowercase URL when caseSensitive is false', () => {
        const adapter = createAdapter();
        setConfig(adapter, { caseSensitive: false });
        const result = (adapter as any).sanitizeUrl('/FOO/BAR');
        expect(result).to.equal('/foo/bar');
      });

      it('should handle all three flags together', () => {
        const adapter = createAdapter();
        setConfig(adapter, {
          ignoreDuplicateSlashes: true,
          ignoreTrailingSlash: true,
          caseSensitive: false,
        });
        const result = (adapter as any).sanitizeUrl('//FOO//BAR/');
        expect(result).to.equal('/foo/bar');
      });

      it('should still decode URI when no flags are set', () => {
        const adapter = createAdapter();
        const result = (adapter as any).sanitizeUrl('/foo%20bar');
        expect(result).to.equal('/foo bar');
      });

      it('should not modify a clean URL with all defaults', () => {
        const adapter = createAdapter();
        const result = (adapter as any).sanitizeUrl('/foo/bar');
        expect(result).to.equal('/foo/bar');
      });
    });

    describe('removeDuplicateSlashes', () => {
      it('should replace // with /', () => {
        const adapter = createAdapter();
        const result = (adapter as any).removeDuplicateSlashes('//foo//bar');
        expect(result).to.equal('/foo/bar');
      });

      it('should handle 3+ slashes', () => {
        const adapter = createAdapter();
        const result = (adapter as any).removeDuplicateSlashes('///foo');
        expect(result).to.equal('/foo');
      });

      it('should not modify path without double slashes', () => {
        const adapter = createAdapter();
        const result = (adapter as any).removeDuplicateSlashes('/foo/bar');
        expect(result).to.equal('/foo/bar');
      });
    });

    describe('trimLastSlash', () => {
      it('should remove trailing slash', () => {
        const adapter = createAdapter();
        const result = (adapter as any).trimLastSlash('/foo/');
        expect(result).to.equal('/foo');
      });

      it('should not remove trailing slash from root path', () => {
        const adapter = createAdapter();
        const result = (adapter as any).trimLastSlash('/');
        expect(result).to.equal('/');
      });

      it('should not modify path without trailing slash', () => {
        const adapter = createAdapter();
        const result = (adapter as any).trimLastSlash('/foo');
        expect(result).to.equal('/foo');
      });
    });
  });
});
