"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const constants_1 = require("../../constants");
const extend_metadata_util_1 = require("../../utils/extend-metadata.util");
/**
 * Sets a response header.
 */
function Header(name, value) {
    return (target, key, descriptor) => {
        extend_metadata_util_1.extendArrayMetadata(constants_1.HEADERS_METADATA, [{ name, value }], descriptor.value);
        return descriptor;
    };
}
exports.Header = Header;
