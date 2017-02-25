import { expect } from 'chai';
import { MiddlewareBuilder } from '../../middlewares/builder';
import { InvalidMiddlewareConfigurationException } from '../../../errors/exceptions/invalid-middleware-configuration.exception';

describe('MiddlewareBuilder', () => {
    let builder: MiddlewareBuilder;

    beforeEach(() => {
        builder = new MiddlewareBuilder();
    });

    it('should store configuration passed as argument', () => {
        builder.use(<any>{
            middlewares: 'Test',
            forRoutes: 'Test'
        });

        expect(builder.build()).to.deep.equal([{
            middlewares: 'Test',
            forRoutes: 'Test'
        }]);
    });

    it('should be possible to chain "use" calls', () => {
        builder.use(<any>{
            middlewares: 'Test',
            forRoutes: 'Test'
        }).use(<any>{
            middlewares: 'Test',
            forRoutes: 'Test'
        });
        expect(builder.build()).to.deep.equal([<any>{
            middlewares: 'Test',
            forRoutes: 'Test'
        }, <any>{
            middlewares: 'Test',
            forRoutes: 'Test'
        }]);
    });

    it('should throw exception when middleware configuration object is invalid', () => {
        expect(builder.use.bind(builder, 'test')).throws(InvalidMiddlewareConfigurationException);
    });

});