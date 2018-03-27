"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
class ExpressAdapter {
    constructor(instance) {
        this.instance = instance;
    }
    use(...args) {
        return this.instance.use(...args);
    }
    get(pathOrHandler, handler) {
        return this.instance.get(pathOrHandler, handler);
    }
    post(pathOrHandler, handler) {
        return this.instance.post(pathOrHandler, handler);
    }
    head(pathOrHandler, handler) {
        return this.instance.head(pathOrHandler, handler);
    }
    delete(pathOrHandler, handler) {
        return this.instance.delete(pathOrHandler, handler);
    }
    put(pathOrHandler, handler) {
        return this.instance.put(pathOrHandler, handler);
    }
    patch(pathOrHandler, handler) {
        return this.instance.patch(pathOrHandler, handler);
    }
    options(pathOrHandler, handler) {
        return this.instance.options(pathOrHandler, handler);
    }
    listen(port, hostname, callback) {
        return this.instance.listen(port, hostname, callback);
    }
    reply(response, body, statusCode) {
        const res = response.status(statusCode);
        if (shared_utils_1.isNil(body)) {
            return res.send();
        }
        return shared_utils_1.isObject(body) ? res.json(body) : res.send(String(body));
    }
    render(response, view, options) {
        return response.render(view, options);
    }
    setErrorHandler(handler) {
        return this.use(handler);
    }
    setNotFoundHandler(handler) {
        return this.use(handler);
    }
    getHttpServer() {
        return this.instance;
    }
    close() {
        return this.instance.close();
    }
    set(...args) {
        return this.instance.set(...args);
    }
    enable(...args) {
        return this.instance.set(...args);
    }
    disable(...args) {
        return this.instance.set(...args);
    }
    engine(...args) {
        return this.instance.set(...args);
    }
    useStaticAssets(path, options) {
        return this.use(express.static(path, options));
    }
    setBaseViewsDir(path) {
        return this.set('views', path);
    }
    setViewEngine(engine) {
        return this.set('view engine', engine);
    }
    getRequestMethod(request) {
        return request.method;
    }
    getRequestUrl(request) {
        return request.url;
    }
}
exports.ExpressAdapter = ExpressAdapter;
