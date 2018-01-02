"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const invalid_module_config_exception_1 = require("./exceptions/invalid-module-config.exception");
const constants_1 = require("../../constants");
const metadataKeys = [
    constants_1.metadata.MODULES,
    constants_1.metadata.IMPORTS,
    constants_1.metadata.EXPORTS,
    constants_1.metadata.COMPONENTS,
    constants_1.metadata.CONTROLLERS,
];
const validateKeys = (keys) => {
    const isKeyValid = key => metadataKeys.findIndex(k => k === key) < 0;
    const validateKey = key => {
        if (isKeyValid(key)) {
            throw new invalid_module_config_exception_1.InvalidModuleConfigException(key);
        }
    };
    keys.forEach(validateKey);
};
/**
 * Defines the module
 * - `modules` - @deprecated the set of the 'imported' modules
 * - `imports` - the set of the 'imported' modules
 * - `controllers` - the list of controllers (e.g. HTTP controllers)
 * - `components` - the list of components that belong to this module. They can be injected between themselves.
 * - `exports` - the set of components, which should be available for modules, which imports this module
 * @param obj {ModuleMetadata} Module metadata
 */
function Module(obj) {
    const propsKeys = Object.keys(obj);
    validateKeys(propsKeys);
    obj.modules = obj.imports && !obj.modules ? obj.imports : obj.modules;
    return (target) => {
        for (const property in obj) {
            if (obj.hasOwnProperty(property)) {
                Reflect.defineMetadata(property, obj[property], target);
            }
        }
    };
}
exports.Module = Module;
