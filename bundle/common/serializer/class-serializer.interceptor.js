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
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const core_1 = require("../decorators/core");
const load_package_util_1 = require("../utils/load-package.util");
const shared_utils_1 = require("../utils/shared.utils");
const class_serializer_constants_1 = require("./class-serializer.constants");
let classTransformer = {};
// NOTE (external)
// We need to deduplicate them here due to the circular dependency
// between core and common packages
const REFLECTOR = 'Reflector';
let ClassSerializerInterceptor = class ClassSerializerInterceptor {
    constructor(reflector) {
        this.reflector = reflector;
        const loadPkg = pkg => load_package_util_1.loadPackage(pkg, 'ClassSerializerInterceptor');
        classTransformer = loadPkg('class-transformer');
    }
    intercept(context, call$) {
        const options = this.getContextOptions(context);
        return call$.pipe(operators_1.map((res) => this.serialize(res, options)));
    }
    serialize(response, options) {
        const isArray = Array.isArray(response);
        if (!shared_utils_1.isObject(response) && !isArray) {
            return response;
        }
        return isArray
            ? response.map(item => this.transformToPlain(item, options))
            : this.transformToPlain(response, options);
    }
    transformToPlain(plainOrClass, options) {
        return plainOrClass && plainOrClass.constructor !== Object
            ? classTransformer.classToPlain(plainOrClass, options)
            : plainOrClass;
    }
    getContextOptions(context) {
        return (this.reflectSerializeMetadata(context.getHandler()) ||
            this.reflectSerializeMetadata(context.getClass()));
    }
    reflectSerializeMetadata(obj) {
        return this.reflector.get(class_serializer_constants_1.CLASS_SERIALIZER_OPTIONS, obj);
    }
};
ClassSerializerInterceptor = __decorate([
    common_1.Injectable(),
    __param(0, core_1.Inject(REFLECTOR)),
    __metadata("design:paramtypes", [Object])
], ClassSerializerInterceptor);
exports.ClassSerializerInterceptor = ClassSerializerInterceptor;
