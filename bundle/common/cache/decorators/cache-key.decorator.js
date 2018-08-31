"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const decorators_1 = require("../../decorators");
const cache_constants_1 = require("../cache.constants");
exports.CacheKey = (key) => decorators_1.ReflectMetadata(cache_constants_1.CACHE_KEY_METADATA, key);
