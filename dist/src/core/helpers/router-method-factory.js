"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_method_enum_1 = require("@nestjs/common/enums/request-method.enum");
class RouterMethodFactory {
    get(target, requestMethod) {
        switch (requestMethod) {
            case request_method_enum_1.RequestMethod.POST: return target.post;
            case request_method_enum_1.RequestMethod.ALL: return target.all;
            case request_method_enum_1.RequestMethod.DELETE: return target.delete;
            case request_method_enum_1.RequestMethod.PUT: return target.put;
            case request_method_enum_1.RequestMethod.PATCH: return target.patch;
            default: {
                return target.get;
            }
        }
    }
}
exports.RouterMethodFactory = RouterMethodFactory;
//# sourceMappingURL=router-method-factory.js.map