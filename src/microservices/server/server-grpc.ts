import * as grpc from 'grpc';
import { Server } from './server';
import {
  MicroserviceOptions,
  GrpcOptions,
} from '../interfaces/microservice-configuration.interface';
import { CustomTransportStrategy } from './../interfaces';
import { Observable } from 'rxjs/Observable';
import { GRPC_DEFAULT_URL } from './../constants';
import { InvalidGrpcPackageException } from '../exceptions/invalid-grpc-package.exception';

export class ServerGrpc extends Server implements CustomTransportStrategy {
  private readonly url: string;
  private grpcClient: any;

  constructor(private readonly options: MicroserviceOptions) {
    super();
    this.url =
      this.getOptionsProp<GrpcOptions>(options, 'url') ||
      GRPC_DEFAULT_URL;
  }

  public async listen(callback: () => void) {
    this.grpcClient = this.createClient();
    await this.start(callback);
  }

  public async start(callback?: () => void) {
    await this.bindEvents();
    this.grpcClient.start();
    callback();
  }

  public async bindEvents() {
    const grpcContext = grpc.load(
      this.getOptionsProp<GrpcOptions>(this.options, 'protoPath'),
    );
    const packageName = this.getOptionsProp<GrpcOptions>(
      this.options,
      'package',
    );
    const grpcPackage = this.lookupPackage(grpcContext, packageName);

    if (!grpcPackage) {
      throw new InvalidGrpcPackageException();
    }
    for (const name of this.getServiceNames(grpcPackage)) {
      this.grpcClient.addService(
        grpcPackage[name].service,
        await this.createService(grpcPackage[name], name),
      );
    }
  }

  public getServiceNames(grpcPackage: any) {
    return Object.keys(grpcPackage).filter(name => grpcPackage[name].service);
  }

  public async createService(grpcService: any, name: string) {
    const service = {};

    for (const methodName in grpcService.prototype) {
      const methodHandler = this.messageHandlers[
        this.createPattern(name, methodName)
      ];
      if (!methodHandler) {
        continue;
      }
      service[methodName] = await this.createServiceMethod(
        methodHandler,
        grpcService.prototype[methodName],
      );
    }
    return service;
  }

  public createPattern(service: string, methodName: string): string {
    return JSON.stringify({
      service,
      rpc: methodName,
    });
  }

  public createServiceMethod(
    methodHandler: Function,
    protoNativeHandler: any,
  ): Function {
    return protoNativeHandler.responseStream
      ? this.createStreamServiceMethod(methodHandler)
      : this.createUnaryServiceMethod(methodHandler);
  }

  public createUnaryServiceMethod(methodHandler): Function {
    return async (call, callback) => {
      const handler = methodHandler(call.request);
      this.transformToObservable(await handler).subscribe(
        data => callback(null, data),
        err => callback(err),
      );
    };
  }

  public createStreamServiceMethod(methodHandler): Function {
    return async (call, callback) => {
      const handler = methodHandler(call.request);
      const result$ = this.transformToObservable(await handler);
      await result$.forEach(data => call.write(data));
      call.end();
    };
  }

  public close() {
    this.grpcClient && this.grpcClient.forceShutdown();
    this.grpcClient = null;
  }

  public deserialize(obj): any {
    try {
      return JSON.parse(obj);
    } catch (e) {
      return obj;
    }
  }

  public createClient(): any {
    const server = new grpc.Server();
    const credentials = this.getOptionsProp<GrpcOptions>(
      this.options,
      'credentials',
    );
    server.bind(
      this.url,
      credentials || grpc.ServerCredentials.createInsecure(),
    );
    return server;
  }

  public lookupPackage(root: any, packageName: string) {
    /** Reference: https://github.com/kondi/rxjs-grpc */
    let pkg = root;
    for (const name of packageName.split(/\./)) {
      pkg = pkg[name];
    }
    return pkg;
  }
}
