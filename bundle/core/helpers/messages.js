"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const request_method_enum_1 = require("@nestjs/common/enums/request-method.enum");
exports.MODULE_INIT_MESSAGE = (text, module) => `${module} dependencies initialized`;
exports.ROUTE_MAPPED_MESSAGE = (path, method) => `Mapped {${path}, ${request_method_enum_1.RequestMethod[method]}} route`;
exports.CONTROLLER_MAPPING_MESSAGE = (name, path) => `${name} {${path}}:`;
