"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const multer = require("multer");
const multer_utils_1 = require("./multer/multer.utils");
function FilesInterceptor(fieldName, maxCount, options) {
    const Interceptor = class {
        constructor() {
            this.upload = multer(options);
        }
        intercept(context, stream$) {
            return __awaiter(this, void 0, void 0, function* () {
                const ctx = context.switchToHttp();
                yield new Promise((resolve, reject) => this.upload.array(fieldName, maxCount)(ctx.getRequest(), ctx.getResponse(), err => {
                    if (err) {
                        const error = multer_utils_1.transformException(err);
                        return reject(error);
                    }
                    resolve();
                }));
                return stream$;
            });
        }
    };
    return Interceptor;
}
exports.FilesInterceptor = FilesInterceptor;
