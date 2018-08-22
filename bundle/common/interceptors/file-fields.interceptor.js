"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const multer = require("multer");
const component_decorator_1 = require("../decorators/core/component.decorator");
const multer_utils_1 = require("./multer/multer.utils");
function FileFieldsInterceptor(uploadFields, options) {
    const Interceptor = component_decorator_1.mixin(class {
        constructor() {
            this.upload = multer(options);
        }
        async intercept(context, call$) {
            const ctx = context.switchToHttp();
            await new Promise((resolve, reject) => this.upload.fields(uploadFields)(ctx.getRequest(), ctx.getResponse(), err => {
                if (err) {
                    const error = multer_utils_1.transformException(err);
                    return reject(error);
                }
                resolve();
            }));
            return call$;
        }
    });
    return Interceptor;
}
exports.FileFieldsInterceptor = FileFieldsInterceptor;
