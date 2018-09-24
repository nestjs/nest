"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const exceptions_1 = require("../../exceptions");
const multer_constants_1 = require("./multer.constants");
function transformException(error) {
    if (!error || error instanceof exceptions_1.HttpException) {
        return error;
    }
    switch (error.message) {
        case multer_constants_1.multerExceptions.LIMIT_FILE_SIZE:
            return new exceptions_1.PayloadTooLargeException(error.message);
        case multer_constants_1.multerExceptions.LIMIT_FILE_COUNT:
        case multer_constants_1.multerExceptions.LIMIT_FIELD_KEY:
        case multer_constants_1.multerExceptions.LIMIT_FIELD_VALUE:
        case multer_constants_1.multerExceptions.LIMIT_FIELD_COUNT:
        case multer_constants_1.multerExceptions.LIMIT_UNEXPECTED_FILE:
        case multer_constants_1.multerExceptions.LIMIT_PART_COUNT:
            return new exceptions_1.BadRequestException(error.message);
    }
    return error;
}
exports.transformException = transformException;
