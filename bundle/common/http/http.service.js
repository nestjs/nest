"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
const axios_1 = require("axios");
const rxjs_1 = require("rxjs");
const decorators_1 = require("../decorators");
const http_constants_1 = require("./http.constants");
let HttpService = class HttpService {
    constructor(instance = axios_1.default) {
        this.instance = instance;
    }
    request(config) {
        return rxjs_1.defer(() => this.instance.request(config));
    }
    get(url, config) {
        return rxjs_1.defer(() => this.instance.get(url, config));
    }
    delete(url, config) {
        return rxjs_1.defer(() => this.instance.delete(url, config));
    }
    head(url, config) {
        return rxjs_1.defer(() => this.instance.head(url, config));
    }
    post(url, data, config) {
        return rxjs_1.defer(() => this.instance.post(url, data, config));
    }
    put(url, data, config) {
        return rxjs_1.defer(() => this.instance.put(url, data, config));
    }
    patch(url, data, config) {
        return rxjs_1.defer(() => this.instance.patch(url, data, config));
    }
    get axiosRef() {
        return this.instance;
    }
};
HttpService = __decorate([
    __param(0, decorators_1.Inject(http_constants_1.AXIOS_INSTANCE_TOKEN)),
    __metadata("design:paramtypes", [Object])
], HttpService);
exports.HttpService = HttpService;
