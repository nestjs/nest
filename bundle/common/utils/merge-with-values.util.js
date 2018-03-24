"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
exports.MergeWithValues = (data) => {
    return (Metatype) => {
        const Type = class extends Metatype {
            constructor(...args) {
                super(...args);
            }
        };
        const token = Metatype.name + JSON.stringify(data);
        Object.defineProperty(Type, 'name', { value: token });
        Object.assign(Type.prototype, data);
        return Type;
    };
};
