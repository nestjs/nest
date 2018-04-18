"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../../constants");
const flatten = arr => {
    const flat = [].concat(...arr);
    return flat.some(Array.isArray) ? flatten(flat) : flat;
};
exports.Dependencies = (...dependencies) => {
    const flattenDeps = flatten(dependencies);
    return (target) => {
        Reflect.defineMetadata(constants_1.PARAMTYPES_METADATA, flattenDeps, target);
    };
};
