"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_method_enum_1 = require("@nestjs/common/enums/request-method.enum");
exports.moduleInitMessage = (module) => `${module} dependencies initialized`;
exports.routeMappedMessage = (path, method) => `Mapped {${path}, ${request_method_enum_1.RequestMethod[method]}} route`;
exports.controllerMappingMessage = (name, path) => `${name} {${path}}:`;
