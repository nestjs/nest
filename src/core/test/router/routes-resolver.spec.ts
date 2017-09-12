import * as sinon from 'sinon';
import { expect } from 'chai';
import { RoutesResolver } from '../../router/routes-resolver';
import { Controller } from '../../../common/utils/decorators/controller.decorator';
import { RequestMapping } from '../../../common/utils/decorators/request-mapping.decorator';
import { RequestMethod } from '../../../common/enums/request-method.enum';
import { ApplicationConfig } from '../../application-config';

describe('RoutesResolver', () => {
    @Controller('global')
    class TestRoute {
        @RequestMapping({ path: 'test' })
        public getTest() {}

        @RequestMapping({ path: 'another-test', method: RequestMethod.POST })
        public anotherTest() {}
    }

    let router;
    let routesResolver: RoutesResolver;

    before(() => {
        router = {
            get() {},
            post() {},
        };
    });

    beforeEach(() => {
        routesResolver = new RoutesResolver(null, {
            createRouter: () => router,
        }, new ApplicationConfig());
    });

    describe('setupRouters', () => {
        it('should method setup controllers to router instance', () => {
            const routes = new Map();
            routes.set('TestRoute', {
                instance: new TestRoute(),
                metatype: TestRoute,
            });

            const use = sinon.spy();
            routesResolver.setupRouters(routes, '', { use } as any);
            expect(use.calledWith('/global', router)).to.be.true;
        });

    });
});