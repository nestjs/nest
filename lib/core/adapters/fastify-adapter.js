"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class FastifyAdapter {
    constructor(instance) {
        this.instance = instance;
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
    close() {
        return this.instance.close();
    }
}
exports.FastifyAdapter = FastifyAdapter;
