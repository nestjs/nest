"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("mocha");
require("reflect-metadata");
const chai_1 = require("chai");
const bind_resolve_values_util_1 = require("../../utils/bind-resolve-values.util");
describe('BindResolveMiddlewareValues', () => {
    let type;
    const arg1 = 3, arg2 = 4;
    class Test {
        resolve(a, b) {
            return () => [a, b];
        }
    }
    beforeEach(() => {
        type = bind_resolve_values_util_1.BindResolveMiddlewareValues([arg1, arg2])(Test);
    });
    it('should pass values to resolve() method', () => {
        const obj = new type();
        const hof = obj.resolve();
        chai_1.expect(hof()).to.deep.equal([arg1, arg2]);
    });
    it('should set name of metatype', () => {
        chai_1.expect(type.name).to.eq(Test.name + JSON.stringify([arg1, arg2]));
    });
});
//# sourceMappingURL=bind-resolve-values.util.spec.js.map