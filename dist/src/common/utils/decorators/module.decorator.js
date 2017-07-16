"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const invalid_module_config_exception_1 = require("../../exceptions/invalid-module-config.exception");
const constants_1 = require("../../constants");
const metadataKeys = [
    constants_1.metadata.MODULES,
    constants_1.metadata.EXPORTS,
    constants_1.metadata.COMPONENTS,
    constants_1.metadata.CONTROLLERS,
];
const validateKeys = (keys) => {
    const isKeyValid = (key) => metadataKeys.findIndex(k => k === key) < 0;
    const validateKey = (key) => {
        if (isKeyValid(key)) {
            throw new invalid_module_config_exception_1.InvalidModuleConfigException(key);
        }
    };
    keys.forEach(validateKey);
};
exports.Module = (props) => {
    const propsKeys = Object.keys(props);
    validateKeys(propsKeys);
    return (target) => {
        for (const property in props) {
            if (props.hasOwnProperty(property)) {
                Reflect.defineMetadata(property, props[property], target);
            }
        }
    };
};
//# sourceMappingURL=module.decorator.js.map