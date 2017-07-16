"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const module_token_factory_1 = require("../../injector/module-token-factory");
const index_1 = require("../../../index");
describe('ModuleTokenFactory', () => {
    let factory;
    beforeEach(() => {
        factory = new module_token_factory_1.ModuleTokenFactory();
    });
    describe('create', () => {
        class Module {
        }
        it('should force reflected scope if isset', () => {
            const scope = '_';
            const token = factory.create(index_1.Shared(scope)(Module), [Module]);
            chai_1.expect(token).to.be.deep.eq(JSON.stringify({
                module: Module.name,
                scope,
            }));
        });
        it('should returns expected token', () => {
            const token = factory.create(Module, [Module]);
            chai_1.expect(token).to.be.deep.eq(JSON.stringify({
                module: Module.name,
                scope: [Module.name],
            }));
        });
    });
    describe('getModuleName', () => {
        it('should map module metatype to name', () => {
            const metatype = () => { };
            chai_1.expect(factory.getModuleName(metatype)).to.be.eql(metatype.name);
        });
    });
    describe('getScopeStack', () => {
        it('should map metatypes to names array', () => {
            const metatype1 = () => { };
            const metatype2 = () => { };
            chai_1.expect(factory.getScopeStack([metatype1, metatype2])).to.be.eql([metatype1.name, metatype2.name]);
        });
    });
});
//# sourceMappingURL=module-token-factory.spec.js.map