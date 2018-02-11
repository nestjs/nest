"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../../constants");
/**
 * Defines a template that should be rendered by a controller.
 */
function Render(template) {
    return (target, key, descriptor) => {
        Reflect.defineMetadata(constants_1.RENDER_METADATA, template, descriptor.value);
        return descriptor;
    };
}
exports.Render = Render;
