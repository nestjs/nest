"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const controller_decorator_1 = require("./controller.decorator");
/**
 * Defines the Controller. The controller can inject dependencies through constructor.
 * Those dependencies have to belong to the same module.
 */
exports.Router = controller_decorator_1.Controller;
