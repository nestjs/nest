"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const MissingRequiredDependency = (name, reason) => `The "${name}" package is missing. Please, make sure to install this library ($ npm install ${name}) to take advantage of ${reason}.`;
class MissingRequiredDependencyException extends Error {
    constructor(name, context) {
        super(MissingRequiredDependency(name, context));
    }
}
exports.MissingRequiredDependencyException = MissingRequiredDependencyException;
function loadPackage(packageName, context) {
    try {
        return require(packageName);
    }
    catch (e) {
        throw new MissingRequiredDependencyException(packageName, context);
    }
}
exports.loadPackage = loadPackage;
