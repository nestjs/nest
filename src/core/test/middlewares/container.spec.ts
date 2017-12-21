import { Component } from '../../../common/decorators/core/component.decorator';
import { Controller } from '../../../common/decorators/core/controller.decorator';
import { MiddlewareConfiguration } from '../../../common/interfaces/middlewares/middleware-configuration.interface';
import { MiddlewaresContainer } from '../../middlewares/container';
import { NestMiddleware } from '../../../common/interfaces/middlewares/nest-middleware.interface';
import { RequestMapping } from '../../../common/decorators/http/request-mapping.decorator';
import { RequestMethod } from '../../../common/enums/request-method.enum';
import { expect } from 'chai';

describe('MiddlewaresContainer', () => {
    @Controller('test')
    class TestRoute {

        @RequestMapping({ path: 'test' })
        public getTest() { }

        @RequestMapping({ path: 'another', method: RequestMethod.DELETE })
        public getAnother() { }
    }

    @Component()
    class TestMiddleware implements NestMiddleware {
        public resolve() {
            return (req: any, res: any, next: any) => { };
        }
    }

    let container: MiddlewaresContainer;

    beforeEach(() => {
        container = new MiddlewaresContainer();
    });

    it('should store expected configurations for given module', () => {
        const config: MiddlewareConfiguration[] = [{
            middlewares: [TestMiddleware],
            forRoutes: [
                TestRoute,
                { path: 'test' },
            ],
        },
        ];
        container.addConfig(config, 'Module' as any);
        expect([...container.getConfigs().get('Module')]).to.deep.equal(config);
    });

    it('should store expected middlewares for given module', () => {
        const config: MiddlewareConfiguration[] = [{
            middlewares: TestMiddleware,
            forRoutes: [TestRoute],
        },
        ];

        const key = 'Test' as any;
        container.addConfig(config, key);
        expect(container.getMiddlewares(key).size).to.eql(config.length);
        expect(container.getMiddlewares(key).get('TestMiddleware')).to.eql({
            instance: null,
            metatype: TestMiddleware,
        });
    });

});
