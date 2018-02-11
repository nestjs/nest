"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const Observable_1 = require("rxjs/Observable");
require("rxjs/add/observable/fromPromise");
class HttpService {
    request(config) {
        return Observable_1.Observable.fromPromise(axios_1.default.request(config));
    }
    get(url, config) {
        return Observable_1.Observable.fromPromise(axios_1.default.get(url, config));
    }
    delete(url, config) {
        return Observable_1.Observable.fromPromise(axios_1.default.delete(url, config));
    }
    head(url, config) {
        return Observable_1.Observable.fromPromise(axios_1.default.head(url, config));
    }
    post(url, data, config) {
        return Observable_1.Observable.fromPromise(axios_1.default.post(url, data, config));
    }
    put(url, data, config) {
        return Observable_1.Observable.fromPromise(axios_1.default.post(url, data, config));
    }
    patch(url, data, config) {
        return Observable_1.Observable.fromPromise(axios_1.default.post(url, data, config));
    }
}
exports.HttpService = HttpService;
