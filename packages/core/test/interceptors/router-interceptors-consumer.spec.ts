import { expect } from 'chai';
import * as sinon from 'sinon';
import { RouterInterceptorsConsumer } from '../../interceptors/router-interceptors-consumer';
import { InterceptorsConsumer } from '../../interceptors/interceptors-consumer';
import { AnyNestInterceptor, DidRender } from '../../../common/interfaces';
import { RouterRenderInterceptorsConsumer } from '../../interceptors/router-render-interceptors-consumer';

describe('RouterInterceptorsConsumer', () => {
  let interceptorsConsumer: InterceptorsConsumer;
  const mockInterceptResult = Promise.resolve('Observable<any>');
  let interceptorsConsumerInterceptSpy: sinon.SinonSpy;
  let routerRenderInterceptorsConsumer: RouterRenderInterceptorsConsumer;
  const mockRenderInterceptResult = Promise.resolve('Observable<any>');
  let routerRenderInterceptorsConsumerPrepareSpy: sinon.SinonSpy;
  let routerRenderInterceptorsConsumerRenderInterceptSpy: sinon.SinonSpy;
  const args = ['arg1', 'arg2'];
  const controller = { contructor: {} };
  const callback = () => null;
  const next = () => Promise.resolve('');
  let routerInterceptorsConsumer: RouterInterceptorsConsumer;
  beforeEach(() => {
    interceptorsConsumer = new InterceptorsConsumer();
    interceptorsConsumerInterceptSpy = sinon
      .stub(interceptorsConsumer, 'intercept')
      .returns(mockInterceptResult);

    routerRenderInterceptorsConsumer = new RouterRenderInterceptorsConsumer();
    routerRenderInterceptorsConsumerRenderInterceptSpy = sinon
      .stub(routerRenderInterceptorsConsumer, 'renderIntercept')
      .returns(mockRenderInterceptResult);
    routerRenderInterceptorsConsumerPrepareSpy = sinon.stub(
      routerRenderInterceptorsConsumer,
      'prepare',
    );
  });
  async function interceptHandlerResponse(
    interceptor: AnyNestInterceptor | AnyNestInterceptor[],
  ) {
    const interceptors = Array.isArray(interceptor)
      ? interceptor
      : [interceptor];
    routerInterceptorsConsumer = new RouterInterceptorsConsumer(
      interceptorsConsumer,
      routerRenderInterceptorsConsumer,
    );
    const result = await routerInterceptorsConsumer.interceptHandlerResponse(
      interceptors,
      args,
      controller,
      callback,
      next,
    );
    return result;
  }
  it('should set filtersInterceptors to false as it filters', () => {
    const ic = new InterceptorsConsumer();
    new RouterInterceptorsConsumer(ic, undefined);
    expect(ic.filterInterceptors).to.be.false;
  });

  describe('when interceptHandlerResponse', () => {
    describe('prepare the RouterRenderInterceptorsConsumer', () => {
      async function expectPrepare(
        expectedRenderInterceptors: AnyNestInterceptor[],
        interceptors: AnyNestInterceptor[],
      ) {
        await interceptHandlerResponse(interceptors);
        expect(
          routerRenderInterceptorsConsumerPrepareSpy.calledOnceWithExactly(
            expectedRenderInterceptors,
            args,
            controller,
            callback,
          ),
        ).to.be.true;
      }
      it('should have render interceptors only', async () => {
        const interceptors = [
          {
            intercept() {
              return null;
            },
            id: 'handlerInteceptor1',
          },
          {
            renderIntercept() {
              return null;
            },
            id: 'renderInteceptor1',
          },
          {
            intercept() {
              return null;
            },
            renderIntercept() {},
            id: 'handlerInteceptor2',
          },
        ];
        await expectPrepare([interceptors[1]], interceptors);
      });
    });
    describe('skip render', () => {
      it('should set InterceptorConsumer.didRender as rendered false', () => {
        const ic = new InterceptorsConsumer();

        new RouterInterceptorsConsumer(ic, undefined);
        expect(ic.didRender.rendered).to.be.false;
      });
      let didRenderRenderAfterInterceptHandlerResponse: boolean;
      async function skipRenderTest(skipRender: boolean) {
        routerInterceptorsConsumer = new RouterInterceptorsConsumer(
          interceptorsConsumer,
          routerRenderInterceptorsConsumer,
        );
        const didRender = interceptorsConsumer.didRender as DidRender;
        didRender.rendered = skipRender;
        const result = await routerInterceptorsConsumer.interceptHandlerResponse(
          [],
          null,
          null,
          null,
          null,
        );
        didRenderRenderAfterInterceptHandlerResponse = didRender.rendered;
        return result;
      }
      describe('when any interceptor rendered', () => {
        it('should skip render', async () => {
          const result = await skipRenderTest(true);
          expect(result.skipRender).to.be.true;
        });
        it('should reset didRender to false', async () => {
          await skipRenderTest(true);
          expect(didRenderRenderAfterInterceptHandlerResponse).to.be.false;
        });
      });
      describe('when no interceptor rendered', () => {
        it('should not skip render', async () => {
          const result = await skipRenderTest(false);
          expect(result.skipRender).to.be.false;
        });
      });
    });
    it('should use the InterceptorsConsumer for the result using the handler interceptors', async () => {
      type InterceptorWithId = AnyNestInterceptor & {
        id?: string;
      };
      const interceptors: InterceptorWithId[] = [
        {
          renderIntercept() {
            return null;
          },
        },
        {
          intercept() {
            return null;
          },
          id: 'handlerInteceptor1',
        },
        {
          intercept() {
            return null;
          },
          id: 'handlerInteceptor2',
        },
        {
          intercept() {
            return null;
          },
          renderIntercept() {
            return null;
          },
          id: 'handlerInteceptor3',
        },
      ];
      const interceptedResponse = await interceptHandlerResponse(interceptors);
      expect(
        interceptorsConsumerInterceptSpy.calledOnceWithExactly(
          [interceptors[1], interceptors[2], interceptors[3]],
          args,
          controller,
          callback,
          next,
          'http',
        ),
      ).to.be.true;
      expect(interceptedResponse.result).to.be.equal('Observable<any>');
    });
  });
  describe('canRenderIntercept', () => {
    async function expectCanRenderIntercept(
      expectedCanRenderIntercept: boolean,
      renderInterceptors: AnyNestInterceptor[],
    ) {
      await interceptHandlerResponse(renderInterceptors);
      const canRenderIntercept = routerInterceptorsConsumer.canRenderIntercept();
      expect(expectedCanRenderIntercept).to.be.eql(canRenderIntercept);
    }
    it('should return true if there are any render interceptors', async () => {
      await expectCanRenderIntercept(true, [
        {
          renderIntercept() {
            return null;
          },
        },
      ]);
    });
    it('should return false if there are no render interceptors', async () => {
      await expectCanRenderIntercept(false, [
        {
          intercept() {
            return null;
          },
          // for backwards compatibility presence of both not a render interceptor
          renderIntercept() {
            return null;
          },
        },
      ]);
    });
  });
  describe('renderIntercept', () => {
    it('should use the RenderInterceptorsConsumer for the result', async () => {
      routerInterceptorsConsumer = new RouterInterceptorsConsumer(
        interceptorsConsumer,
        routerRenderInterceptorsConsumer,
      );
      const result = await routerInterceptorsConsumer.renderIntercept(
        'rendered view',
      );

      expect(
        routerRenderInterceptorsConsumerRenderInterceptSpy.calledOnceWithExactly(
          'rendered view',
        ),
      ).to.be.true;
      expect(result).to.be.eql('Observable<any>');
    });
  });
});
