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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
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
const class_validator_1 = require("class-validator");
const class_transformer_1 = require("class-transformer");
const index_1 = require("../index");
const shared_utils_1 = require("../utils/shared.utils");
const component_decorator_1 = require("./../decorators/core/component.decorator");
let ValidationPipe = class ValidationPipe {
    constructor(options) {
        options = options || {};
        const { transform } = options, validatorOptions = __rest(options, ["transform"]);
        this.isTransformEnabled = !!transform;
        this.validatorOptions = validatorOptions;
    }
    transform(value, metadata) {
        return __awaiter(this, void 0, void 0, function* () {
            const { metatype } = metadata;
            if (!metatype || !this.toValidate(metadata)) {
                return value;
            }
            const entity = class_transformer_1.plainToClass(metatype, value);
            const errors = yield class_validator_1.validate(entity, this.validatorOptions);
            if (errors.length > 0) {
                throw new index_1.BadRequestException(errors);
            }
            return this.isTransformEnabled
                ? entity
                : Object.keys(this.validatorOptions).length > 0
                    ? class_transformer_1.classToPlain(entity)
                    : value;
        });
    }
    toValidate(metadata) {
        const { metatype, type } = metadata;
        if (type === 'custom') {
            return false;
        }
        const types = [String, Boolean, Number, Array, Object];
        return !types.find(type => metatype === type) && !shared_utils_1.isNil(metatype);
    }
};
ValidationPipe = __decorate([
    component_decorator_1.Pipe(),
    __metadata("design:paramtypes", [Object])
], ValidationPipe);
exports.ValidationPipe = ValidationPipe;
