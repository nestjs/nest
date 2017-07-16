"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BindResolveMiddlewareValues = (data) => {
    return (Metatype) => {
        const type = class extends Metatype {
            resolve() {
                return super.resolve(...data);
            }
        };
        const token = Metatype.name + JSON.stringify(data);
        Object.defineProperty(type, 'name', { value: token });
        return type;
    };
};
//# sourceMappingURL=bind-resolve-values.util.js.map