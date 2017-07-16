"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const chai_1 = require("chai");
const shared_decorator_1 = require("../../utils/decorators/shared.decorator");
const constants_1 = require("../../constants");
describe('Shared', () => {
    let type;
    const token = '_';
    class Test {
    }
    beforeEach(() => {
        type = shared_decorator_1.Shared(token)(Test);
    });
    it('should enrich metatype with SharedModule token', () => {
        const opaqueToken = Reflect.getMetadata(constants_1.SHARED_MODULE_METADATA, type);
        chai_1.expect(opaqueToken).to.be.equal(token);
    });
    it('should set name of the metatype', () => {
        chai_1.expect(type.name).to.eq(Test.name);
    });
});
//# sourceMappingURL=shared.decorator.spec.js.map