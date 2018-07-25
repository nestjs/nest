"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const multer = require("multer");
const multer_utils_1 = require("./multer/multer.utils");
function FilesInterceptor(fieldName, maxCount, options) {
    const Interceptor = class {
        constructor() {
            this.upload = multer(options);
        }
        async intercept(context, call$) {
            const ctx = context.switchToHttp();
            await new Promise((resolve, reject) => this.upload.array(fieldName, maxCount)(ctx.getRequest(), ctx.getResponse(), err => {
                if (err) {
                    const error = multer_utils_1.transformException(err);
                    return reject(error);
                }
                resolve();
            }));
            return call$;
        }
    };
    return Interceptor;
}
exports.FilesInterceptor = FilesInterceptor;
