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
const client_proxy_1 = require("./client-proxy");
const logger_service_1 = require("@nestjs/common/services/logger.service");
const constants_1 = require("./../constants");
const rxjs_1 = require("rxjs");
const invalid_grpc_service_exception_1 = require("../exceptions/invalid-grpc-service.exception");
const invalid_grpc_package_exception_1 = require("../exceptions/invalid-grpc-package.exception");
const invalid_proto_definition_exception_1 = require("../exceptions/invalid-proto-definition.exception");
const load_package_util_1 = require("@nestjs/common/utils/load-package.util");
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
            throw new invalid_grpc_package_exception_1.InvalidGrpcPackageException();
        }
        return grpcPkg;
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
    publish(partialPacket, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            throw new Error('Method is not supported in gRPC mode. Use ClientGrpc instead (learn more in the documentation).');
        });
    }
}
exports.ClientGrpcProxy = ClientGrpcProxy;
