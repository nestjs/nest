import * as sinon from 'sinon';
import { expect } from 'chai';
import { RoutesResolver } from '../../router/routes-resolver';
import { Controller } from '../../../common/utils/controller.decorator';
import { RequestMapping } from '../../../common/utils/request-mapping.decorator';
import { RequestMethod } from '../../../common/enums/request-method.enum';

describe('RoutesResolver', () => {
    @Controller({ path: 'global' })
    class TestRoute {
        @RequestMapping({ path: 'test' })
        getTest() {}

        @RequestMapping({ path: 'another-test', method: RequestMethod.POST })
        anotherTest() {}
    }

    let router;
    let routesResolver: RoutesResolver;

    before(() => {
        router = {
            get() {},
            post() {}
        };
    });

    beforeEach(() => {
        routesResolver = new RoutesResolver(null, {
            createRouter: () => router,
        });
    });

    describe('setupRouters', () => {

        it('should method setup controllers to express application instance', () => {
            const routes = new Map();
            routes.set('TestRoute', {
                instance: new TestRoute(),
                metatype: TestRoute
            });

            const use = sinon.spy();
            const applicationMock = { use };

            routesResolver.setupRouters(routes, <any>applicationMock);
            expect(use.calledOnce).to.be.true;
            expect(use.calledWith('/global', router)).to.be.true;
        });

    });
});