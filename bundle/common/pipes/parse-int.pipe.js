"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
const bad_request_exception_1 = require("../exceptions/bad-request.exception");
const index_1 = require("../index");
let ParseIntPipe = class ParseIntPipe {
    async transform(value, metadata) {
        const isNumeric = 'string' === typeof value &&
            !isNaN(parseFloat(value)) &&
            isFinite(value);
        if (!isNumeric) {
            throw new bad_request_exception_1.BadRequestException('Validation failed (numeric string is expected)');
        }
        return parseInt(value, 10);
    }
};
ParseIntPipe = __decorate([
    index_1.Injectable()
], ParseIntPipe);
exports.ParseIntPipe = ParseIntPipe;
