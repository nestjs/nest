"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const load_package_util_1 = require("@nestjs/common/utils/load-package.util");
const pathToRegexp = require("path-to-regexp");
class FastifyAdapter {
    constructor(options) {
        this.instance = load_package_util_1.loadPackage('fastify', 'FastifyAdapter')(options);
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
    getInstance() {
        return this.instance;
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
        return this.register(load_package_util_1.loadPackage('fastify-static', 'FastifyAdapter.useStaticAssets()'), options);
    }
    setViewEngine(options) {
        return this.register(load_package_util_1.loadPackage('point-of-view', 'FastifyAdapter.setViewEngine()'), options);
    }
    setHeader(response, name, value) {
        return response.header(name, value);
    }
    getRequestMethod(request) {
        return request.raw.method;
    }
    getRequestUrl(request) {
        return request.raw.url;
    }
    createMiddlewareFactory(requestMethod) {
        return (path, callback) => {
            const re = pathToRegexp(path);
            const normalizedPath = path === '/*' ? '' : path;
            this.instance.use(normalizedPath, (req, res, next) => {
                if (!re.exec(req.originalUrl + '/')) {
                    return next();
                }
                if (requestMethod === common_1.RequestMethod.ALL ||
                    req.method === common_1.RequestMethod[requestMethod]) {
                    return callback(req, res, next);
                }
                next();
            });
        };
    }
}
exports.FastifyAdapter = FastifyAdapter;
