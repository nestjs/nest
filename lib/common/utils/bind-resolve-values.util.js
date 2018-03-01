"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const component_decorator_1 = require("../decorators/core/component.decorator");
exports.BindResolveMiddlewareValues = (data) => {
    return (Metatype) => {
        const type = class extends Metatype {
            resolve() {
                return super.resolve(...data);
            }
        };
        const token = Metatype.name + JSON.stringify(data);
        Object.defineProperty(type, 'name', { value: token });
        component_decorator_1.Injectable()(type);
        return type;
    };
};
