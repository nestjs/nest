"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const decorators_1 = require("../../decorators");
const class_serializer_constants_1 = require("../class-serializer.constants");
exports.SerializeOptions = (options) => decorators_1.ReflectMetadata(class_serializer_constants_1.CLASS_SERIALIZER_OPTIONS, options);
