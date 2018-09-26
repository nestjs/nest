"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const deprecate = require("deprecate");
require("reflect-metadata");
const constants_1 = require("../../constants");
const invalid_module_config_exception_1 = require("./exceptions/invalid-module-config.exception");
const metadataKeys = [
    constants_1.METADATA.MODULES,
    constants_1.METADATA.IMPORTS,
    constants_1.METADATA.EXPORTS,
    constants_1.METADATA.COMPONENTS,
    constants_1.METADATA.CONTROLLERS,
    constants_1.METADATA.PROVIDERS,
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
 * @param options {ModuleMetadata} Module metadata
 */
function Module(metadata) {
    const propsKeys = Object.keys(metadata);
    validateKeys(propsKeys);
    showDeprecatedWarnings(metadata);
    overrideModuleMetadata(metadata);
    return (target) => {
        for (const property in metadata) {
            if (metadata.hasOwnProperty(property)) {
                Reflect.defineMetadata(property, metadata[property], target);
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
    const MODULES_DEPRECATED_WARNING = 'The "modules" key in the @Module() decorator is deprecated and will be removed within next major release. Use the "imports" key instead.';
    const COMPONENTS_DEPRECATED_WARNING = 'The "components" key in the @Module() decorator is deprecated and will be removed within next major release. Use the "providers" key instead.';
    moduleMetadata.modules && deprecate(MODULES_DEPRECATED_WARNING);
    moduleMetadata.components && deprecate(COMPONENTS_DEPRECATED_WARNING);
}
