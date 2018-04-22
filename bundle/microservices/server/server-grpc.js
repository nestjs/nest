"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const server_1 = require("./server");
const constants_1 = require("./../constants");
const invalid_grpc_package_exception_1 = require("../exceptions/invalid-grpc-package.exception");
const invalid_proto_definition_exception_1 = require("../exceptions/invalid-proto-definition.exception");
let grpcPackage = {};
class ServerGrpc extends server_1.Server {
    constructor(options) {
        super();
        this.options = options;
        this.url =
            this.getOptionsProp(options, 'url') || constants_1.GRPC_DEFAULT_URL;
        grpcPackage = this.loadPackage('grpc', ServerGrpc.name);
    }
    listen(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            this.grpcClient = this.createClient();
            yield this.start(callback);
        });
    }
    start(callback) {
        return __awaiter(this, void 0, void 0, function* () {
            yield this.bindEvents();
            this.grpcClient.start();
            callback();
        });
    }
    bindEvents() {
        return __awaiter(this, void 0, void 0, function* () {
            const grpcContext = this.loadProto();
            const packageName = this.getOptionsProp(this.options, 'package');
            const grpcPkg = this.lookupPackage(grpcContext, packageName);
            if (!grpcPkg) {
                throw new invalid_grpc_package_exception_1.InvalidGrpcPackageException();
            }
            for (const name of this.getServiceNames(grpcPkg)) {
                this.grpcClient.addService(grpcPkg[name].service, yield this.createService(grpcPkg[name], name));
            }
        });
    }
    getServiceNames(grpcPkg) {
        return Object.keys(grpcPkg).filter(name => grpcPkg[name].service);
    }
    createService(grpcService, name) {
        return __awaiter(this, void 0, void 0, function* () {
            const service = {};
            // tslint:disable-next-line:forin
            for (const methodName in grpcService.prototype) {
                const methodHandler = this.messageHandlers[this.createPattern(name, methodName)];
                if (!methodHandler) {
                    continue;
                }
                service[methodName] = yield this.createServiceMethod(methodHandler, grpcService.prototype[methodName]);
            }
            return service;
        });
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
        return (call, callback) => __awaiter(this, void 0, void 0, function* () {
            const handler = methodHandler(call.request, call.metadata);
            this.transformToObservable(yield handler).subscribe(data => callback(null, data), err => callback(err));
        });
    }
    createStreamServiceMethod(methodHandler) {
        return (call, callback) => __awaiter(this, void 0, void 0, function* () {
            const handler = methodHandler(call.request, call.metadata);
            const result$ = this.transformToObservable(yield handler);
            yield result$.forEach(data => call.write(data));
            call.end();
        });
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
            const context = grpcPackage.load(this.getOptionsProp(this.options, 'protoPath'));
            return context;
        }
        catch (e) {
            throw new invalid_proto_definition_exception_1.InvalidProtoDefinitionException();
        }
    }
}
exports.ServerGrpc = ServerGrpc;
