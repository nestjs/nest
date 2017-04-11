import 'mocha';
import 'reflect-metadata';
import { expect } from 'chai';
import { BindResolveMiddlewareValues } from '../../utils/bind-resolve-values.util';
import { NestMiddleware } from '../../../core/middlewares/interfaces/nest-middleware.interface';

describe('BindResolveMiddlewareValues', () => {
    let type,
        arg1 = 3,
        arg2 = 4;

    class Test implements NestMiddleware {
        resolve(a, b) {
            return () => [a, b];
        }
    }

    beforeEach(() => {
        type = BindResolveMiddlewareValues([ arg1, arg2 ])(Test);
    });
    it('should pass values to resolve() method', () => {
        const obj = new type();
        const hof = obj.resolve();
        expect(hof()).to.deep.equal([arg1, arg2]);
    });
    it('should set name of metatype', () => {
        expect(type.name).to.eq((<any>Test).name + JSON.stringify([ arg1, arg2 ]));
    });
});