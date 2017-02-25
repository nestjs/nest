import { expect } from 'chai';
import * as sinon from 'sinon';
import { NestMiddleware } from '../../middlewares/interfaces/nest-middleware.interface';
import { Component } from '../../../common/utils/component.decorator';
import { MiddlewareBuilder } from '../../middlewares/builder';
import { MiddlewaresModule } from '../../middlewares/middlewares-module';
import { UnkownMiddlewareException } from '../../../errors/exceptions/unkown-middleware.exception';
import { InvalidMiddlewareException } from '../../../errors/exceptions/invalid-middleware.exception';
import { RequestMethod } from '../../../common/enums/request-method.enum';
import { Controller } from '../../../common/utils/controller.decorator';
import { RequestMapping } from '../../../common/utils/request-mapping.decorator';

describe('MiddlewaresModule', () => {
    @Controller({ path: 'test' })
    class AnotherRoute { }

    @Controller({ path: 'test' })
    class TestRoute {

        @RequestMapping({ path: 'test' })
        getTest() {}

        @RequestMapping({ path: 'another', method: RequestMethod.DELETE })
        getAnother() {}
    }

    @Component()
    class TestMiddleware implements NestMiddleware {
        resolve() {
            return (req, res, next) => {}
        }
    }

    describe('loadConfiguration', () => {

        it('should call "configure" method if method is implemented', () => {
            const configureSpy = sinon.spy();
            const mockModule = {
                configure: configureSpy
            };

            MiddlewaresModule.loadConfiguration(<any>mockModule, <any>'Test');

            expect(configureSpy.calledOnce).to.be.true;
            expect(configureSpy.calledWith(new MiddlewareBuilder())).to.be.true;
        });
    });

    describe('setupRouteMiddleware', () => {

        it('should throw "UnkownMiddlewareException" exception when middlewares is not stored in container', () => {
            const route = { path: 'Test' };
            const configuration = {
                middlewares: [ TestMiddleware ],
                forRoutes: [ TestRoute ]
            };

            const useSpy = sinon.spy();
            const app = { use: useSpy };

            expect(MiddlewaresModule.setupRouteMiddleware.bind(
                MiddlewaresModule, route, configuration, <any>'Test', <any>app
            )).throws(UnkownMiddlewareException);
        });

        it('should throw "InvalidMiddlewareException" exception when middlewares does not have "resolve" method', () => {
            @Component()
            class InvalidMiddleware {}

            const route = { path: 'Test' };
            const configuration = {
                middlewares: [ InvalidMiddleware ],
                forRoutes: [ TestRoute ]
            };

            const useSpy = sinon.spy();
            const app = { use: useSpy };

            const container = MiddlewaresModule.getContainer();
            const moduleKey = <any>'Test';
            container.addConfig([ <any>configuration ], moduleKey);

            const instance = new InvalidMiddleware();
            container.getMiddlewares(moduleKey).set('InvalidMiddleware', <any>{
                metatype: InvalidMiddleware,
                instance
            });

            expect(MiddlewaresModule.setupRouteMiddleware.bind(
                MiddlewaresModule, route, configuration, moduleKey, <any>app
            )).throws(InvalidMiddlewareException);
        });

        it('should store middlewares when middleware is stored in container', () => {
            const route = { path: 'Test', method: RequestMethod.GET };
            const configuration = {
                middlewares: [ TestMiddleware ],
                forRoutes: [ { path: 'test' }, AnotherRoute, TestRoute ]
            };

            const useSpy = sinon.spy();
            const app = {
                get: useSpy
            };

            const container = MiddlewaresModule.getContainer();
            const moduleKey = <any>'Test';
            container.addConfig([ configuration ], moduleKey);

            const instance = new TestMiddleware();
            container.getMiddlewares(moduleKey).set('TestMiddleware', {
                metatype: TestMiddleware,
                instance
            });

            MiddlewaresModule.setupRouteMiddleware(route, configuration, moduleKey, <any>app);
            expect(useSpy.calledOnce).to.be.true;
        });

    });

});