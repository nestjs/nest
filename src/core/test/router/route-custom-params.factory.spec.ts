import { expect } from 'chai';
import { RouteCustomParamsFactory } from '../../router/route-custom-params-factory';
import { ICustomParamReflector } from '../../../common/interfaces/custom-route-param-reflector.interface';
import { ApplicationConfig } from '../../application-config';

describe('RouteCustomParamsFactory', () => {
    let factory: RouteCustomParamsFactory;
    let config: ApplicationConfig;
    beforeEach(() => {
        config = new ApplicationConfig();
        factory = new RouteCustomParamsFactory(config);
    });
    describe('exchangeKeyForValue', () => {
        const res = {};
        const next = () => ({});
        const req = {
            session: null,
            body: {
                foo: 'bar',
            },
            headers: {
                foo: 'bar',
            },
            params: {
                foo: 'bar',
            },
            query: {
                foo: 'bar',
            },
        };
        const args = ['key', null, { req, res, next }];
        it('should return null if config is nil', () => {
            let factory2 = new RouteCustomParamsFactory();
            expect((factory2 as any).exchangeKeyForValue(...args)).to.be.eql(null);
        });
        it('should return null if no custom decorators found', () => {
            expect((factory as any).exchangeKeyForValue(...args)).to.be.eql(null);
        });
        it('should return null is reflector throws an error', () => {
            const reflector = {
                paramtype: 'key',
                reflector: (data, req, res, next) => { throw new Error },
            } as ICustomParamReflector;
            config.useCustomParamDecorators(reflector);
            expect((factory as any).exchangeKeyForValue(...args)).to.be.eql(null);
        });
        it('should return reflector result', () => {
            const reflector = {
                paramtype: 'key',
                reflector: (data, req, res, next) => true,
            } as ICustomParamReflector;
            config.useCustomParamDecorators(reflector);
            expect((factory as any).exchangeKeyForValue(...args)).to.be.eql(true);
        });
    });
});