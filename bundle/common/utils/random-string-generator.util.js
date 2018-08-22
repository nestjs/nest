"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.randomStringGenerator = () => Math.random()
    .toString(36)
    .substring(2, 32);
