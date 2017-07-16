"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const router_method_factory_1 = require("../../helpers/router-method-factory");
const request_method_enum_1 = require("../../../common/enums/request-method.enum");
describe('RouterMethodFactory', () => {
    let factory;
    const target = {
        get: () => { },
        post: () => { },
        all: () => { },
        delete: () => { },
        put: () => { },
        patch: () => { },
    };
    beforeEach(() => {
        factory = new router_method_factory_1.RouterMethodFactory();
    });
    it('should return proper method', () => {
        chai_1.expect(factory.get(target, request_method_enum_1.RequestMethod.DELETE)).to.equal(target.delete);
        chai_1.expect(factory.get(target, request_method_enum_1.RequestMethod.POST)).to.equal(target.post);
        chai_1.expect(factory.get(target, request_method_enum_1.RequestMethod.ALL)).to.equal(target.all);
        chai_1.expect(factory.get(target, request_method_enum_1.RequestMethod.PUT)).to.equal(target.put);
        chai_1.expect(factory.get(target, request_method_enum_1.RequestMethod.GET)).to.equal(target.get);
        chai_1.expect(factory.get(target, request_method_enum_1.RequestMethod.PATCH)).to.equal(target.patch);
    });
});
//# sourceMappingURL=router-method-factory.spec.js.map