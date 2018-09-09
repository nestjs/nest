"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const rxjs_1 = require("rxjs");
const operators_1 = require("rxjs/operators");
const constants_1 = require("../constants");
const invalid_grpc_package_exception_1 = require("../exceptions/errors/invalid-grpc-package.exception");
const invalid_proto_definition_exception_1 = require("../exceptions/errors/invalid-proto-definition.exception");
const server_1 = require("./server");
let grpcPackage = {};
let grpcProtoLoaderPackage = {};
class ServerGrpc extends server_1.Server {
    constructor(options) {
        super();
        this.options = options;
        this.url =
            this.getOptionsProp(options, 'url') || constants_1.GRPC_DEFAULT_URL;
        grpcPackage = this.loadPackage('grpc', ServerGrpc.name);
        grpcProtoLoaderPackage = this.loadPackage('@grpc/proto-loader', ServerGrpc.name);
    }
    async listen(callback) {
        this.grpcClient = this.createClient();
        await this.start(callback);
    }
    async start(callback) {
        await this.bindEvents();
        this.grpcClient.start();
        callback();
    }
    async bindEvents() {
        const grpcContext = this.loadProto();
        const packageName = this.getOptionsProp(this.options, 'package');
        const grpcPkg = this.lookupPackage(grpcContext, packageName);
        if (!grpcPkg) {
            const invalidPackageError = new invalid_grpc_package_exception_1.InvalidGrpcPackageException();
            this.logger.error(invalidPackageError.message, invalidPackageError.stack);
            throw invalidPackageError;
        }
        for (const name of this.getServiceNames(grpcPkg)) {
            this.grpcClient.addService(grpcPkg[name].service, await this.createService(grpcPkg[name], name));
        }
    }
    getServiceNames(grpcPkg) {
        return Object.keys(grpcPkg).filter(name => grpcPkg[name].service);
    }
    async createService(grpcService, name) {
        const service = {};
        // tslint:disable-next-line:forin
        for (const methodName in grpcService.prototype) {
            const methodHandler = this.messageHandlers[this.createPattern(name, methodName)];
            if (!methodHandler) {
                continue;
            }
            service[methodName] = await this.createServiceMethod(methodHandler, grpcService.prototype[methodName]);
        }
        return service;
    }
    createPattern(service, methodName) {
        return JSON.stringify({
            service,
            rpc: methodName,
        });
    }
    createServiceMethod(methodHandler, protoNativeHandler) {
        return protoNativeHandler.responseStream
            ? this.createStreamServiceMethod(methodHandler)
            : this.createUnaryServiceMethod(methodHandler);
    }
    createUnaryServiceMethod(methodHandler) {
        return async (call, callback) => {
            const handler = methodHandler(call.request, call.metadata);
            this.transformToObservable(await handler).subscribe(data => callback(null, data), err => callback(err));
        };
    }
    createStreamServiceMethod(methodHandler) {
        return async (call, callback) => {
            const handler = methodHandler(call.request, call.metadata);
            const result$ = this.transformToObservable(await handler);
            await result$
                .pipe(operators_1.takeUntil(rxjs_1.fromEvent(call, constants_1.CANCEL_EVENT)))
                .forEach(data => call.write(data));
            call.end();
        };
    }
    close() {
        this.grpcClient && this.grpcClient.forceShutdown();
        this.grpcClient = null;
    }
    deserialize(obj) {
        try {
            return JSON.parse(obj);
        }
        catch (e) {
            return obj;
        }
    }
    createClient() {
        const server = new grpcPackage.Server();
        const credentials = this.getOptionsProp(this.options, 'credentials');
        server.bind(this.url, credentials || grpcPackage.ServerCredentials.createInsecure());
        return server;
    }
    lookupPackage(root, packageName) {
        /** Reference: https://github.com/kondi/rxjs-grpc */
        let pkg = root;
        for (const name of packageName.split(/\./)) {
            pkg = pkg[name];
        }
        return pkg;
    }
    loadProto() {
        try {
            const file = this.getOptionsProp(this.options, 'protoPath');
            const loader = this.getOptionsProp(this.options, 'loader');
            const packageDefinition = grpcProtoLoaderPackage.loadSync(file, loader);
            const packageObject = grpcPackage.loadPackageDefinition(packageDefinition);
            return packageObject;
        }
        catch (err) {
            const invalidProtoError = new invalid_proto_definition_exception_1.InvalidProtoDefinitionException();
            const message = err && err.message ? err.message : invalidProtoError.message;
            this.logger.error(message, invalidProtoError.stack);
            throw invalidProtoError;
        }
    }
}
exports.ServerGrpc = ServerGrpc;
