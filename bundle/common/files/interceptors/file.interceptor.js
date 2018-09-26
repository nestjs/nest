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
const multer = require("multer");
const decorators_1 = require("../../decorators");
const component_decorator_1 = require("../../decorators/core/component.decorator");
const files_constants_1 = require("../files.constants");
const multer_utils_1 = require("../multer/multer.utils");
function FileInterceptor(fieldName, localOptions) {
    let MixinInterceptor = class MixinInterceptor {
        constructor(options = {}) {
            this.upload = multer(Object.assign({}, options, localOptions));
        }
        async intercept(context, call$) {
            const ctx = context.switchToHttp();
            await new Promise((resolve, reject) => this.upload.single(fieldName)(ctx.getRequest(), ctx.getResponse(), err => {
                if (err) {
                    const error = multer_utils_1.transformException(err);
                    return reject(error);
                }
                resolve();
            }));
            return call$;
        }
    };
    MixinInterceptor = __decorate([
        __param(0, decorators_1.Optional()),
        __param(0, decorators_1.Inject(files_constants_1.MULTER_MODULE_OPTIONS)),
        __metadata("design:paramtypes", [Object])
    ], MixinInterceptor);
    const Interceptor = component_decorator_1.mixin(MixinInterceptor);
    return Interceptor;
}
exports.FileInterceptor = FileInterceptor;
