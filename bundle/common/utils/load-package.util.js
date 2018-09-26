"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_service_1 = require("../services/logger.service");
const MISSING_REQUIRED_DEPENDENCY = (name, reason) => `The "${name}" package is missing. Please, make sure to install this library ($ npm install ${name}) to take advantage of ${reason}.`;
const logger = new logger_service_1.Logger('PackageLoader');
function loadPackage(packageName, context) {
    try {
        return require(packageName);
    }
    catch (e) {
        logger.error(MISSING_REQUIRED_DEPENDENCY(packageName, context));
        process.exit(1);
    }
}
exports.loadPackage = loadPackage;
