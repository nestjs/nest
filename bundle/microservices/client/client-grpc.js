"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const logger_service_1 = require("@nestjs/common/services/logger.service");
const load_package_util_1 = require("@nestjs/common/utils/load-package.util");
const rxjs_1 = require("rxjs");
const invalid_grpc_package_exception_1 = require("../exceptions/invalid-grpc-package.exception");
const invalid_grpc_service_exception_1 = require("../exceptions/invalid-grpc-service.exception");
const invalid_proto_definition_exception_1 = require("../exceptions/invalid-proto-definition.exception");
const constants_1 = require("./../constants");
const client_proxy_1 = require("./client-proxy");
let grpcPackage = {};
class ClientGrpcProxy extends client_proxy_1.ClientProxy {
    constructor(options) {
        super();
        this.options = options;
        this.logger = new logger_service_1.Logger(client_proxy_1.ClientProxy.name);
        this.url =
            this.getOptionsProp(options, 'url') || constants_1.GRPC_DEFAULT_URL;
        grpcPackage = load_package_util_1.loadPackage('grpc', ClientGrpcProxy.name);
        this.grpcClient = this.createClient();
    }
    getService(name) {
        const { options } = this.options;
        if (!this.grpcClient[name]) {
            throw new invalid_grpc_service_exception_1.InvalidGrpcServiceException();
        }
        const grpcClient = new this.grpcClient[name](this.url, options.credentials || grpcPackage.credentials.createInsecure(), options);
        const protoMethods = Object.keys(this.grpcClient[name].prototype);
        const grpcService = {};
        protoMethods.forEach(m => {
            const key = m[0].toLowerCase() + m.slice(1, m.length);
            grpcService[key] = this.createServiceMethod(grpcClient, m);
        });
        return grpcService;
    }
    createServiceMethod(client, methodName) {
        return client[methodName].responseStream
            ? this.createStreamServiceMethod(client, methodName)
            : this.createUnaryServiceMethod(client, methodName);
    }
    createStreamServiceMethod(client, methodName) {
        return (...args) => {
            return new rxjs_1.Observable(observer => {
                const call = client[methodName](...args);
                call.on('data', (data) => observer.next(data));
                call.on('error', (error) => observer.error(error));
                call.on('end', () => observer.complete());
            });
        };
    }
    createUnaryServiceMethod(client, methodName) {
        return (...args) => {
            return new rxjs_1.Observable(observer => {
                client[methodName](...args, (error, data) => {
                    if (error) {
                        return observer.error(error);
                    }
                    observer.next(data);
                    observer.complete();
                });
            });
        };
    }
    createClient() {
        const grpcContext = this.loadProto();
        const packageName = this.getOptionsProp(this.options, 'package');
        const grpcPkg = this.lookupPackage(grpcContext, packageName);
        if (!grpcPkg) {
            const invalidPackageError = new invalid_grpc_package_exception_1.InvalidGrpcPackageException();
            this.logger.error(invalidPackageError.message, invalidPackageError.stack);
            throw invalidPackageError;
        }
        return grpcPkg;
    }
    loadProto() {
        try {
            const root = this.getOptionsProp(this.options, 'root');
            const file = this.getOptionsProp(this.options, 'protoPath');
            const options = root ? { root, file } : file;
            const context = grpcPackage.load(options);
            return context;
        }
        catch (e) {
            const invalidProtoError = new invalid_proto_definition_exception_1.InvalidProtoDefinitionException();
            this.logger.error(invalidProtoError.message, invalidProtoError.stack);
            throw invalidProtoError;
        }
    }
    lookupPackage(root, packageName) {
        /** Reference: https://github.com/kondi/rxjs-grpc */
        let pkg = root;
        for (const name of packageName.split(/\./)) {
            pkg = pkg[name];
        }
        return pkg;
    }
    close() {
        this.grpcClient && this.grpcClient.close();
        this.grpcClient = null;
    }
    async connect() {
        throw new Error('The "connect()" method is not supported in gRPC mode.');
    }
    async publish(partialPacket, callback) {
        throw new Error('Method is not supported in gRPC mode. Use ClientGrpc instead (learn more in the documentation).');
    }
}
exports.ClientGrpcProxy = ClientGrpcProxy;
