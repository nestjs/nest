import { expect } from 'chai';
import * as sinon from 'sinon';
import { NestMiddleware } from '../../../common/interfaces/middlewares/nest-middleware.interface';
import { Component } from '../../../common/utils/decorators/component.decorator';
import { MiddlewareBuilder } from '../../middlewares/builder';
import { MiddlewaresModule } from '../../middlewares/middlewares-module';
import { InvalidMiddlewareException } from '../../errors/exceptions/invalid-middleware.exception';
import { RequestMethod } from '../../../common/enums/request-method.enum';
import { Controller } from '../../../common/utils/decorators/controller.decorator';
import { RequestMapping } from '../../../common/utils/decorators/request-mapping.decorator';
import { RuntimeException } from '../../errors/exceptions/runtime.exception';
import { RoutesMapper } from '../../middlewares/routes-mapper';
import { RouterExceptionFilters } from '../../router/router-exception-filters';
import { ApplicationConfig } from '../../application-config';

describe('MiddlewaresModule', () => {
    @Controller({ path: 'test' })
    class AnotherRoute { }

    @Controller({ path: 'test' })
    class TestRoute {

        @RequestMapping({ path: 'test' })
        public getTest() {}

        @RequestMapping({ path: 'another', method: RequestMethod.DELETE })
        public getAnother() {}
    }

    @Component()
    class TestMiddleware implements NestMiddleware {
        public resolve() {
            return (req, res, next) => {};
        }
    }

    beforeEach(() => {
        (MiddlewaresModule as any).routerExceptionFilter = new RouterExceptionFilters(
            new ApplicationConfig(),
        );
    });

    describe('loadConfiguration', () => {

        it('should call "configure" method if method is implemented', () => {
            const configureSpy = sinon.spy();
            const mockModule = {
                configure: configureSpy,
            };

            MiddlewaresModule.loadConfiguration(mockModule as any, 'Test' as any);

            expect(configureSpy.calledOnce).to.be.true;
            expect(configureSpy.calledWith(new MiddlewareBuilder(new RoutesMapper()))).to.be.true;
        });
    });

    describe('setupRouteMiddleware', () => {

        it('should throw "RuntimeException" exception when middlewares is not stored in container', () => {
            const route = { path: 'Test' };
            const configuration = {
                middlewares: [ TestMiddleware ],
                forRoutes: [ TestRoute ],
            };

            const useSpy = sinon.spy();
            const app = { use: useSpy };

            expect(
                MiddlewaresModule.setupRouteMiddleware(route as any, configuration, 'Test' as any, app as any),
            ).to.eventually.be.rejectedWith(RuntimeException);
        });

        it('should throw "InvalidMiddlewareException" exception when middlewares does not have "resolve" method', () => {
            @Component()
            class InvalidMiddleware {}

            const route = { path: 'Test' };
            const configuration = {
                middlewares: [ InvalidMiddleware ],
                forRoutes: [ TestRoute ],
            };

            const useSpy = sinon.spy();
            const app = { use: useSpy };

            const container = MiddlewaresModule.getContainer();
            const moduleKey = 'Test' as any;
            container.addConfig([ configuration as any ], moduleKey);

            const instance = new InvalidMiddleware();
            container.getMiddlewares(moduleKey).set('InvalidMiddleware', {
                metatype: InvalidMiddleware,
                instance,
            } as any);

            expect(
                MiddlewaresModule.setupRouteMiddleware(route as any, configuration, moduleKey, app as any),
            ).to.be.rejectedWith(InvalidMiddlewareException);
        });

        it('should store middlewares when middleware is stored in container', () => {
            const route = { path: 'Test', method: RequestMethod.GET };
            const configuration = {
                middlewares: [ TestMiddleware ],
                forRoutes: [ { path: 'test' }, AnotherRoute, TestRoute ],
            };

            const useSpy = sinon.spy();
            const app = {
                get: useSpy,
            };

            const container = MiddlewaresModule.getContainer();
            const moduleKey = 'Test' as any;
            container.addConfig([ configuration ], moduleKey);

            const instance = new TestMiddleware();
            container.getMiddlewares(moduleKey).set('TestMiddleware', {
                metatype: TestMiddleware,
                instance,
            });

            MiddlewaresModule.setupRouteMiddleware(route, configuration, moduleKey, app as any);
            expect(useSpy.calledOnce).to.be.true;
        });

    });

});