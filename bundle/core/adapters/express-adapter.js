"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const express = require("express");
const router_method_factory_1 = require("../helpers/router-method-factory");
class ExpressAdapter {
    constructor(instance) {
        this.instance = instance;
        this.routerMethodFactory = new router_method_factory_1.RouterMethodFactory();
        this.httpServer = null;
    }
    use(...args) {
        return this.instance.use(...args);
    }
    get(...args) {
        return this.instance.get(...args);
    }
    post(...args) {
        return this.instance.post(...args);
    }
    head(...args) {
        return this.instance.head(...args);
    }
    delete(...args) {
        return this.instance.delete(...args);
    }
    put(...args) {
        return this.instance.put(...args);
    }
    patch(...args) {
        return this.instance.patch(...args);
    }
    options(...args) {
        return this.instance.options(...args);
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
    setHeader(response, name, value) {
        return response.set(name, value);
    }
    getHttpServer() {
        return this.httpServer;
    }
    setHttpServer(httpServer) {
        this.httpServer = httpServer;
    }
    getInstance() {
        return this.instance;
    }
    close() {
        return this.instance.close();
    }
    set(...args) {
        return this.instance.set(...args);
    }
    enable(...args) {
        return this.instance.enable(...args);
    }
    disable(...args) {
        return this.instance.disable(...args);
    }
    engine(...args) {
        return this.instance.engine(...args);
    }
    useStaticAssets(path, options) {
        if (options && options.prefix) {
            return this.use(options.prefix, express.static(path, options));
        }
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
    createMiddlewareFactory(requestMethod) {
        return this.routerMethodFactory
            .get(this.instance, requestMethod)
            .bind(this.instance);
    }
}
exports.ExpressAdapter = ExpressAdapter;
