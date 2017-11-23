"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const runtime_exception_1 = require("./runtime.exception");
const messages_1 = require("../messages");
class MicroservicesPackageNotFoundException extends runtime_exception_1.RuntimeException {
    constructor() {
        super(messages_1.MICROSERVICES_PACKAGE_NOT_FOUND_EXCEPTION);
    }
}
exports.MicroservicesPackageNotFoundException = MicroservicesPackageNotFoundException;
