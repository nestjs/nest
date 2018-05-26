"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const rxjs_1 = require("rxjs");
class HttpService {
    request(config) {
        return rxjs_1.from(axios_1.default.request(config));
    }
    get(url, config) {
        return rxjs_1.from(axios_1.default.get(url, config));
    }
    delete(url, config) {
        return rxjs_1.from(axios_1.default.delete(url, config));
    }
    head(url, config) {
        return rxjs_1.from(axios_1.default.head(url, config));
    }
    post(url, data, config) {
        return rxjs_1.from(axios_1.default.post(url, data, config));
    }
    put(url, data, config) {
        return rxjs_1.from(axios_1.default.put(url, data, config));
    }
    patch(url, data, config) {
        return rxjs_1.from(axios_1.default.patch(url, data, config));
    }
}
exports.HttpService = HttpService;
