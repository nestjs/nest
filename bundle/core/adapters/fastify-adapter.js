"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const missing_dependency_exception_1 = require("../errors/exceptions/missing-dependency.exception");
class FastifyAdapter {
    constructor(options) {
        this.logger = new common_1.Logger(FastifyAdapter.name);
        try {
            this.instance = require('fastify')(options);
        }
        catch (e) {
            throw new missing_dependency_exception_1.MissingRequiredDependencyException('fastify', 'FastifyAdapter');
        }
    }
    use(pathOrHandler, handler) {
        return handler
            ? this.instance.use(pathOrHandler, handler)
            : this.instance.use(pathOrHandler);
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
        return response.code(statusCode).send(body);
    }
    render(response, view, options) {
        return response.view(view, options);
    }
    setErrorHandler(handler) {
        return this.instance.setErrorHandler(handler);
    }
    setNotFoundHandler(handler) {
        return this.instance.setNotFoundHandler(handler);
    }
    getHttpServer() {
        return this.instance.server;
    }
    register(...args) {
        return this.instance.register(...args);
    }
    inject(...args) {
        return this.instance.inject(...args);
    }
    close() {
        return this.instance.close();
    }
    useStaticAssets(options) {
        try {
            return this.register(require('fastify-static'), options);
        }
        catch (e) {
            throw new missing_dependency_exception_1.MissingRequiredDependencyException('fastify-static', 'FastifyAdapter.useStaticAssets()');
        }
    }
    setViewEngine(options) {
        try {
            return this.register(require('point-of-view'), options);
        }
        catch (e) {
            throw new missing_dependency_exception_1.MissingRequiredDependencyException('point-of-view', 'FastifyAdapter.setViewEngine()');
        }
    }
    getRequestMethod(request) {
        return request.raw.method;
    }
    getRequestUrl(request) {
        return request.raw.url;
    }
}
exports.FastifyAdapter = FastifyAdapter;
