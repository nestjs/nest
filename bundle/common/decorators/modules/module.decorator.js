"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const deprecate = require("deprecate");
const constants_1 = require("../../constants");
const invalid_module_config_exception_1 = require("./exceptions/invalid-module-config.exception");
const metadataKeys = [
    constants_1.metadata.MODULES,
    constants_1.metadata.IMPORTS,
    constants_1.metadata.EXPORTS,
    constants_1.metadata.COMPONENTS,
    constants_1.metadata.CONTROLLERS,
    constants_1.metadata.PROVIDERS,
];
const validateKeys = (keys) => {
    const isKeyInvalid = key => metadataKeys.findIndex(k => k === key) < 0;
    const validateKey = key => {
        if (!isKeyInvalid(key)) {
            return;
        }
        throw new invalid_module_config_exception_1.InvalidModuleConfigException(key);
    };
    keys.forEach(validateKey);
};
/**
 * Defines the module
 * - `imports` - the set of the 'imported' modules
 * - `controllers` - the list of controllers (e.g. HTTP controllers)
 * - `providers` - the list of providers that belong to this module. They can be injected between themselves.
 * - `exports` - the set of components, which should be available for modules, which imports this module
 * - `components` - @deprecated the list of components that belong to this module. They can be injected between themselves.
 * @param obj {ModuleMetadata} Module metadata
 */
function Module(obj) {
    const propsKeys = Object.keys(obj);
    validateKeys(propsKeys);
    showDeprecatedWarnings(obj);
    overrideModuleMetadata(obj);
    return (target) => {
        for (const property in obj) {
            if (obj.hasOwnProperty(property)) {
                Reflect.defineMetadata(property, obj[property], target);
            }
        }
    };
}
exports.Module = Module;
function overrideModuleMetadata(moduleMetadata) {
    moduleMetadata.modules = moduleMetadata.imports
        ? moduleMetadata.imports
        : moduleMetadata.modules;
    moduleMetadata.components = moduleMetadata.providers
        ? moduleMetadata.providers
        : moduleMetadata.components;
}
function showDeprecatedWarnings(moduleMetadata) {
    const modulesDeprecatedWarning = 'The "modules" key in the @Module() decorator is deprecated and will be removed within next major release. Use the "imports" key instead.';
    const componentsDeprecatetWarning = 'The "components" key in the @Module() decorator is deprecated and will be removed within next major release. Use the "providers" key instead.';
    moduleMetadata.modules && deprecate(modulesDeprecatedWarning);
    moduleMetadata.components && deprecate(componentsDeprecatetWarning);
}
