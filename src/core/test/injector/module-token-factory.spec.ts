import * as sinon from 'sinon';
import { expect } from 'chai';
import { ModuleTokenFactory } from '../../injector/module-token-factory';
import { Shared } from '../../../index';

describe('ModuleTokenFactory', () => {
    let factory: ModuleTokenFactory;
    beforeEach(() => {
        factory = new ModuleTokenFactory();
    });
    describe('create', () => {
        class Module {}
        it('should force reflected scope if isset', () => {
            const scope = '_';
            const token = factory.create(
                Shared(scope)(Module) as any,
                [Module],
            );
            expect(token).to.be.deep.eq(JSON.stringify({
                module: Module.name,
                scope,
            }));
        });
        it('should returns expected token', () => {
            const token = factory.create(
                Module,
                [Module],
            );
            expect(token).to.be.deep.eq(JSON.stringify({
                module: Module.name,
                scope: [Module.name],
            }));
        });
    });
    describe('getModuleName', () => {
        it('should map module metatype to name', () => {
            const metatype = () => {};
            expect(factory.getModuleName(metatype as any)).to.be.eql(metatype.name);
        });
    });
    describe('getScopeStack', () => {
        it('should map metatypes to names array', () => {
            const metatype1 = () => {};
            const metatype2 = () => {};
            expect(factory.getScopeStack([metatype1 as any, metatype2 as any])).to.be.eql([metatype1.name, metatype2.name]);
        });
    });
});