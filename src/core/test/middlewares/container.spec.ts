import { expect } from 'chai';
import { MiddlewaresContainer } from '../../middlewares/container';
import { MiddlewareConfiguration } from '../../middlewares/interfaces/middleware-configuration.interface';
import { NestMiddleware } from '../../middlewares/interfaces/nest-middleware.interface';
import { Component } from '../../../common/utils/component.decorator';
import { RoutesMapper } from '../../middlewares/routes-mapper';
import { Controller } from '../../../common/utils/controller.decorator';
import { RequestMapping } from '../../../common/utils/request-mapping.decorator';
import { RequestMethod } from '../../../common/enums/request-method.enum';

describe('MiddlewaresContainer', () => {
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

    let container: MiddlewaresContainer;

    beforeEach(() => {
        container = new MiddlewaresContainer(new RoutesMapper());
    });

    it('should store expected configurations for given module', () => {
        const config: MiddlewareConfiguration[] = [{
                middlewares: [ TestMiddleware ],
                forRoutes: [
                    TestRoute,
                    { path: 'test' }
                ]
            }
        ];
        container.addConfig(config, <any>'Module');
        expect([ ...container.getConfigs().get('Module') ]).to.deep.equal(config);
    });

    it('should store expected middlewares for given module', () => {
        const config: MiddlewareConfiguration[] = [{
                middlewares: TestMiddleware,
                forRoutes: [ TestRoute ]
            }
        ];

        const key = <any>'Test';
        container.addConfig(config, key);
        expect(container.getMiddlewares(key).size).to.eql(config.length);
        expect(container.getMiddlewares(key).get('TestMiddleware')).to.eql({
            instance: null,
            metatype: TestMiddleware
        });
    });

});