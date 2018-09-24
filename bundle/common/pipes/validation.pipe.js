"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) if (e.indexOf(p[i]) < 0)
            t[p[i]] = s[p[i]];
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
const decorators_1 = require("../decorators");
const index_1 = require("../index");
const load_package_util_1 = require("../utils/load-package.util");
const shared_utils_1 = require("../utils/shared.utils");
const component_decorator_1 = require("../decorators/core/component.decorator");
let classValidator = {};
let classTransformer = {};
let ValidationPipe = class ValidationPipe {
    constructor(options) {
        options = options || {};
        const { transform, disableErrorMessages } = options, validatorOptions = __rest(options, ["transform", "disableErrorMessages"]);
        this.isTransformEnabled = !!transform;
        this.validatorOptions = validatorOptions;
        this.isDetailedOutputDisabled = disableErrorMessages;
        const loadPkg = pkg => load_package_util_1.loadPackage(pkg, 'ValidationPipe');
        classValidator = loadPkg('class-validator');
        classTransformer = loadPkg('class-transformer');
    }
    async transform(value, metadata) {
        const { metatype } = metadata;
        if (!metatype || !this.toValidate(metadata)) {
            return value;
        }
        const entity = classTransformer.plainToClass(metatype, this.toEmptyIfNil(value));
        const errors = await classValidator.validate(entity, this.validatorOptions);
        if (errors.length > 0) {
            throw new index_1.BadRequestException(this.isDetailedOutputDisabled ? undefined : errors);
        }
        return this.isTransformEnabled
            ? entity
            : Object.keys(this.validatorOptions).length > 0
                ? classTransformer.classToPlain(entity)
                : value;
    }
    toValidate(metadata) {
        const { metatype, type } = metadata;
        if (type === 'custom') {
            return false;
        }
        const types = [String, Boolean, Number, Array, Object];
        return !types.some(t => metatype === t) && !shared_utils_1.isNil(metatype);
    }
    toEmptyIfNil(value) {
        return shared_utils_1.isNil(value) ? {} : value;
    }
};
ValidationPipe = __decorate([
    component_decorator_1.Injectable(),
    __param(0, decorators_1.Optional()),
    __metadata("design:paramtypes", [Object])
], ValidationPipe);
exports.ValidationPipe = ValidationPipe;
