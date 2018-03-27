"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const fromPromise_1 = require("rxjs/observable/fromPromise");
class HttpService {
    request(config) {
        return fromPromise_1.fromPromise(axios_1.default.request(config));
    }
    get(url, config) {
        return fromPromise_1.fromPromise(axios_1.default.get(url, config));
    }
    delete(url, config) {
        return fromPromise_1.fromPromise(axios_1.default.delete(url, config));
    }
    head(url, config) {
        return fromPromise_1.fromPromise(axios_1.default.head(url, config));
    }
    post(url, data, config) {
        return fromPromise_1.fromPromise(axios_1.default.post(url, data, config));
    }
    put(url, data, config) {
        return fromPromise_1.fromPromise(axios_1.default.post(url, data, config));
    }
    patch(url, data, config) {
        return fromPromise_1.fromPromise(axios_1.default.post(url, data, config));
    }
}
exports.HttpService = HttpService;
