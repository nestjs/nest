"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const chai_1 = require("chai");
const merge_with_values_util_1 = require("../../utils/merge-with-values.util");
describe('MergeWithValues', () => {
    let type;
    const data = { test: [1, 2, 3] };
    class Test {
    }
    beforeEach(() => {
        type = merge_with_values_util_1.MergeWithValues(data)(Test);
    });
    it('should enrich prototype with given values', () => {
        chai_1.expect(type.prototype).to.contain(data);
    });
    it('should set name of metatype', () => {
        chai_1.expect(type.name).to.eq(Test.name + JSON.stringify(data));
    });
});
//# sourceMappingURL=merge-with-values.util.spec.js.map