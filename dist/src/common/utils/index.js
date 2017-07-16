"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
__export(require("./decorators/request-mapping.decorator"));
__export(require("./decorators/controller.decorator"));
__export(require("./decorators/component.decorator"));
__export(require("./decorators/module.decorator"));
__export(require("./decorators/dependencies.decorator"));
__export(require("./decorators/inject.decorator"));
__export(require("./decorators/route-params.decorator"));
__export(require("./decorators/catch.decorator"));
__export(require("./decorators/exception-filters.decorator"));
__export(require("./decorators/shared.decorator"));
__export(require("./decorators/use-pipes.decorator"));
__export(require("./decorators/use-guards.decorator"));
var component_decorator_1 = require("./decorators/component.decorator");
exports.Middleware = component_decorator_1.Component;
var component_decorator_2 = require("./decorators/component.decorator");
exports.Pipe = component_decorator_2.Component;
var component_decorator_3 = require("./decorators/component.decorator");
exports.Guard = component_decorator_3.Component;
//# sourceMappingURL=index.js.map