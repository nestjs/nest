import { isNil, isObject } from '@nestjs/common/utils/shared.utils';
import { expect } from 'chai';
import { of } from 'rxjs';
import * as sinon from 'sinon';
import { RequestMethod, HttpStatus } from '../../../common';
import { RouterResponseController } from '../../router/router-response-controller';
import { NoopHttpAdapter } from '../utils/noop-adapter.spec';

describe('RouterResponseController', () => {
  let adapter: NoopHttpAdapter;
  let routerResponseController: RouterResponseController;

  beforeEach(() => {
    adapter = new NoopHttpAdapter({});
    routerResponseController = new RouterResponseController(adapter);
  });

  describe('apply', () => {
    let response: {
      send: sinon.SinonSpy;
      status?: sinon.SinonSpy;
      json: sinon.SinonSpy;
    };
    beforeEach(() => {
      response = { send: sinon.spy(), json: sinon.spy(), status: sinon.spy() };
    });
    describe('when result is', () => {
      beforeEach(() => {
        sinon
          .stub(adapter, 'reply')
          .callsFake((responseRef: any, body: any, statusCode?: number) => {
            if (statusCode) {
              responseRef.status(statusCode);
            }
            if (isNil(body)) {
              return responseRef.send();
            }
            return isObject(body)
              ? responseRef.json(body)
              : responseRef.send(String(body));
          });
      });
      describe('nil', () => {
        it('should call send()', async () => {
          const value = null;
          await routerResponseController.apply(value, response, 200);
          expect(response.send.called).to.be.true;
        });
      });
      describe('string', () => {
        it('should call send(value)', async () => {
          const value = 'string';
          await routerResponseController.apply(value, response, 200);
          expect(response.send.called).to.be.true;
          expect(response.send.calledWith(String(value))).to.be.true;
        });
      });
      describe('object', () => {
        it('should call json(value)', async () => {
          const value = { test: 'test' };
          await routerResponseController.apply(value, response, 200);
          expect(response.json.called).to.be.true;
          expect(response.json.calledWith(value)).to.be.true;
        });
      });
    });
  });

  describe('transformToResult', () => {
    describe('when resultOrDeffered', () => {
      describe('is Promise', () => {
        it('should returns Promise', async () => {
          const value = 100;
          expect(
            await routerResponseController.transformToResult(
              Promise.resolve(value),
            ),
          ).to.be.eq(100);
        });
      });

      describe('is Observable', () => {
        it('should returns toPromise', async () => {
          const lastValue = 100;
          expect(
            await routerResponseController.transformToResult(
              of(1, 2, 3, lastValue),
            ),
          ).to.be.eq(100);
        });
      });

      describe('is value', () => {
        it('should returns Promise', async () => {
          const value = 100;
          expect(
            await routerResponseController.transformToResult(value),
          ).to.be.eq(100);
        });
      });
    });
  });

  describe('getStatusByMethod', () => {
    describe('when RequestMethod is POST', () => {
      it('should returns 201', () => {
        expect(
          routerResponseController.getStatusByMethod(RequestMethod.POST),
        ).to.be.eql(201);
      });
    });
    describe('when RequestMethod is not POST', () => {
      it('should returns 200', () => {
        expect(
          routerResponseController.getStatusByMethod(RequestMethod.GET),
        ).to.be.eql(200);
      });
    });
  });

  describe('render', () => {
    beforeEach(() => {
      sinon
        .stub(adapter, 'render')
        .callsFake((response, view: string, options: any) => {
          return response.render(view, options);
        });
    });
    it('should call "res.render()" with expected args', async () => {
      const template = 'template';
      const result = 'test';
      const response = { render: sinon.spy() };

      await routerResponseController.render(result, response, template);
      expect(response.render.calledWith(template, result)).to.be.true;
    });
  });

  describe('rendering to string', () => {
    describe('canRenderToString', () => {
      it('should return true if the adapter has the renderToString function', () => {
        routerResponseController = new RouterResponseController({
          renderToString() {},
        } as any);
        expect(routerResponseController.canRenderToString()).to.be.true;
      });
      it('should return false if the adapter does not have the renderToString function', () => {
        routerResponseController = new RouterResponseController({
          renderToString: true,
        } as any);
        expect(routerResponseController.canRenderToString()).to.be.false;
        routerResponseController = new RouterResponseController({} as any);
        expect(routerResponseController.canRenderToString()).to.be.false;
      });
    });
    describe('renderToString', () => {
      it('should renderToString on the adapter with expected arguments', async () => {
        const renderToStringAdapter = {
          renderToString: sinon
            .stub()
            .returns(Promise.resolve('rendered view')),
          setHeader: () => {},
        };
        routerResponseController = new RouterResponseController(
          renderToStringAdapter as any,
        );
        const response = {};
        const template = 'template';
        const renderedTemplate = await routerResponseController.renderToString(
          'result',
          response,
          template,
        );
        expect(
          renderToStringAdapter.renderToString.calledOnceWithExactly(
            template,
            'result',
            sinon.match.same(response),
          ),
        ).to.be.true;
        expect(renderedTemplate).to.eql('rendered view');
      });
      it('should set Content-Type text/html header', async () => {
        const renderToStringAdapter = {
          renderToString: sinon
            .stub()
            .returns(Promise.resolve('rendered view')),
          setHeader: () => {},
        };
        routerResponseController = new RouterResponseController(
          renderToStringAdapter as any,
        );
        const setHeadersSpy = sinon.stub(
          routerResponseController,
          'setHeaders',
        );
        sinon
          .stub(routerResponseController, 'transformToResult')
          .returns(Promise.resolve('transformedResult'));
        const response = {};
        await routerResponseController.renderToString(
          'resultOrDeffered',
          response,
          undefined,
        );
        setHeadersSpy.calledOnceWithExactly(sinon.match.same(response), [
          { name: 'Content-Type', value: 'text/html; charset=utf-8' },
        ]);
      });
    });
  });

  describe('setHeaders', () => {
    let setHeaderStub: sinon.SinonStub;

    beforeEach(() => {
      setHeaderStub = sinon.stub(adapter, 'setHeader').callsFake(() => ({}));
    });

    it('should set all custom headers', () => {
      const response = {};
      const headers = [{ name: 'test', value: 'test_value' }];

      routerResponseController.setHeaders(response, headers);
      expect(
        setHeaderStub.calledWith(response, headers[0].name, headers[0].value),
      ).to.be.true;
    });
  });

  describe('setContentTypeHtml', () => {
    it('should setHeader content type text/hmtl', () => {
      const setHeaderSpy = sinon.spy(adapter, 'setHeader');
      const response = {};
      routerResponseController.setContentTypeHtml(response);
      expect(
        setHeaderSpy.calledOnceWithExactly(
          sinon.match.same(response),
          'Content-Type',
          'text/html; charset=utf-8',
        ),
      ).to.be.true;
    });
  });
  describe('status', () => {
    let statusStub: sinon.SinonStub;

    beforeEach(() => {
      statusStub = sinon.stub(adapter, 'status').callsFake(() => ({}));
    });

    it('should set status', () => {
      const response = {};
      const statusCode = 400;

      routerResponseController.setStatus(response, statusCode);
      expect(statusStub.calledWith(response, statusCode)).to.be.true;
    });
  });

  describe('redirect should HttpServer.redirect', () => {
    it('should transformToResult', async () => {
      const transformToResultSpy = sinon
        .stub(routerResponseController, 'transformToResult')
        .returns(Promise.resolve({ statusCode: 123, url: 'redirect url' }));
      const result = {};
      await routerResponseController.redirect(result, null, null);
      expect(transformToResultSpy.firstCall.args[0]).to.be.equal(result);
    });
    it('should pass the response to redirect', async () => {
      sinon
        .stub(routerResponseController, 'transformToResult')
        .returns(Promise.resolve({ statusCode: 123, url: 'redirect url' }));
      const redirectSpy = sinon.spy(adapter, 'redirect');
      const response = {};
      await routerResponseController.redirect(null, response, null);
      expect(redirectSpy.firstCall.args[0]).to.be.equal(response);
    });
    describe('status code', () => {
      it('should come from the transformed result if present', async () => {
        sinon
          .stub(routerResponseController, 'transformToResult')
          .returns(Promise.resolve({ statusCode: 123, url: 'redirect url' }));
        const redirectSpy = sinon.spy(adapter, 'redirect');
        await routerResponseController.redirect(null, null, {
          statusCode: 999,
          url: 'not form here',
        });
        expect(redirectSpy.firstCall.args[1]).to.be.eql(123);
      });
      it('should come from the redirectResponse if not on the transformed result', async () => {
        sinon
          .stub(routerResponseController, 'transformToResult')
          .returns(Promise.resolve({}));
        const redirectSpy = sinon.spy(adapter, 'redirect');
        await routerResponseController.redirect(null, null, {
          statusCode: 123,
          url: 'redirect url',
        });
        expect(redirectSpy.firstCall.args[1]).to.be.eql(123);
      });
      it('should default to HttpStatus.FOUND', async () => {
        sinon
          .stub(routerResponseController, 'transformToResult')
          .returns(Promise.resolve({}));
        const redirectSpy = sinon.spy(adapter, 'redirect');
        await routerResponseController.redirect(null, null, {
          url: 'redirect url',
        });
        expect(redirectSpy.firstCall.args[1]).to.be.eql(HttpStatus.FOUND);
      });
    });
    describe('url', () => {
      it('should come from the transformed result if present', async () => {
        sinon
          .stub(routerResponseController, 'transformToResult')
          .returns(Promise.resolve({ statusCode: 123, url: 'redirect url' }));
        const redirectSpy = sinon.spy(adapter, 'redirect');
        await routerResponseController.redirect(null, null, {
          url: 'not from here',
        });
        expect(redirectSpy.firstCall.args[2]).to.be.eql('redirect url');
      });
      it('should come from the redirectResponse if not on the transformed result', async () => {
        sinon
          .stub(routerResponseController, 'transformToResult')
          .returns(Promise.resolve({}));
        const redirectSpy = sinon.spy(adapter, 'redirect');
        await routerResponseController.redirect(null, null, {
          statusCode: 123,
          url: 'redirect url',
        });
        expect(redirectSpy.firstCall.args[2]).to.be.eql('redirect url');
      });
    });
  });
});
