import { isObject, isUndefined } from '@nestjs/common/utils/shared.utils';
import { fromEvent } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import {
  CANCEL_EVENT,
  GRPC_DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH,
  GRPC_DEFAULT_MAX_SEND_MESSAGE_LENGTH,
  GRPC_DEFAULT_PROTO_LOADER,
  GRPC_DEFAULT_URL,
} from '../constants';
import { InvalidGrpcPackageException } from '../errors/invalid-grpc-package.exception';
import { InvalidProtoDefinitionException } from '../errors/invalid-proto-definition.exception';
import { CustomTransportStrategy } from '../interfaces';
import {
  GrpcOptions,
  MicroserviceOptions,
} from '../interfaces/microservice-configuration.interface';
import { Server } from './server';

let grpcPackage: any = {};
let grpcProtoLoaderPackage: any = {};

interface GrpcCall<TRequest = any, TMetadata = any> {
  request: TRequest;
  metadata: TMetadata;
  end: Function;
  write: Function;
}
export class ServerGrpc extends Server implements CustomTransportStrategy {
  private readonly url: string;
  private grpcClient: any;

  constructor(private readonly options: MicroserviceOptions['options']) {
    super();
    this.url =
      this.getOptionsProp<GrpcOptions>(options, 'url') || GRPC_DEFAULT_URL;

    const protoLoader =
      this.getOptionsProp<GrpcOptions>(options, 'protoLoader') ||
      GRPC_DEFAULT_PROTO_LOADER;

    grpcPackage = this.loadPackage('grpc', ServerGrpc.name, () =>
      require('grpc'),
    );
    grpcProtoLoaderPackage = this.loadPackage(protoLoader, ServerGrpc.name);
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
    const grpcContext = this.loadProto();
    const packageOpt = this.getOptionsProp<GrpcOptions>(
      this.options,
      'package',
    );
    // if packages more then 1
    const packageNames = Array.isArray(packageOpt) ? packageOpt : [packageOpt];

    for (const packageName of packageNames) {
      const grpcPkg = this.lookupPackage(grpcContext, packageName);

      if (!grpcPkg) {
        const invalidPackageError = new InvalidGrpcPackageException();
        this.logger.error(invalidPackageError.message, invalidPackageError.stack);
        throw invalidPackageError;
      }

      // Take all of the services defined in grpcPkg and assign them to
      // method handlers defined in Controllers
      for (const definition of this.getServiceNames(grpcPkg)) {
        this.grpcClient.addService(
          // First parameter requires exact service definition from proto
          definition.service.service,
          // Here full proto definition required along with namespaced pattern name
          await this.createService(definition.service, definition.name),
        );
      }
    }
  }

  /**
   * Will return all of the services along with their fully namespaced
   * names as an array of objects.
   * This method initiates recursive scan of grpcPkg object
   */
  public getServiceNames(grpcPkg: any): { name: string; service: any }[] {
    // Define accumulator to collect all of the services available to load
    const services: { name: string; service: any }[] = [];
    // Initiate recursive services collector starting with empty name
    this.collectDeepServices('', grpcPkg, services);
    return services;
  }

  public async createService(grpcService: any, name: string) {
    const service = {};

    // tslint:disable-next-line:forin
    for (const methodName in grpcService.prototype) {
      const methodHandler = this.getHandlerByPattern(
        this.createPattern(name, methodName),
      );
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

  public createUnaryServiceMethod(methodHandler: Function): Function {
    return async (call: GrpcCall, callback: Function) => {
      const handler = methodHandler(call.request, call.metadata);
      this.transformToObservable(await handler).subscribe(
        data => callback(null, data),
        (err: any) => callback(err),
      );
    };
  }

  public createStreamServiceMethod(methodHandler: Function): Function {
    return async (call: GrpcCall, callback: Function) => {
      const handler = methodHandler(call.request, call.metadata);
      const result$ = this.transformToObservable(await handler);
      await result$
        .pipe(takeUntil(fromEvent(call as any, CANCEL_EVENT)))
        .forEach(data => call.write(data));
      call.end();
    };
  }

  public close() {
    this.grpcClient && this.grpcClient.forceShutdown();
    this.grpcClient = null;
  }

  public deserialize(obj: any): any {
    try {
      return JSON.parse(obj);
    } catch (e) {
      return obj;
    }
  }

  public createClient(): any {
    const server = new grpcPackage.Server({
      'grpc.max_send_message_length': this.getOptionsProp<GrpcOptions>(
        this.options,
        'maxSendMessageLength',
        GRPC_DEFAULT_MAX_SEND_MESSAGE_LENGTH,
      ),
      'grpc.max_receive_message_length': this.getOptionsProp<GrpcOptions>(
        this.options,
        'maxReceiveMessageLength',
        GRPC_DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH,
      ),
    });
    const credentials = this.getOptionsProp<GrpcOptions>(
      this.options,
      'credentials',
    );
    server.bind(
      this.url,
      credentials || grpcPackage.ServerCredentials.createInsecure(),
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

  public loadProto(): any {
    try {
      const file = this.getOptionsProp<GrpcOptions>(this.options, 'protoPath');
      const loader = this.getOptionsProp<GrpcOptions>(this.options, 'loader');

      const packageDefinition = grpcProtoLoaderPackage.loadSync(file, loader);
      const packageObject = grpcPackage.loadPackageDefinition(
        packageDefinition,
      );
      return packageObject;
    } catch (err) {
      const invalidProtoError = new InvalidProtoDefinitionException();
      const message =
        err && err.message ? err.message : invalidProtoError.message;

      this.logger.error(message, invalidProtoError.stack);
      throw invalidProtoError;
    }
  }

  /**
   * Recursively fetch all of the service methods available on loaded
   * protobuf descriptor object, and collect those as an objects with
   * dot-syntax full-path names.
   *
   * Example:
   *  for proto package Bundle.FirstService with service Events { rpc...
   *  will be resolved to object of (while loaded for Bundle package):
   *    {
   *      name: "FirstService.Events",
   *      service: {Object}
   *    }
   */
  private collectDeepServices(
    name: string,
    grpcDefinition: any,
    accumulator: { name: string; service: any }[],
  ) {
    if (!isObject(grpcDefinition)) {
      return;
    }
    const keysToTraverse = Object.keys(grpcDefinition);
    // Traverse definitions or namespace extensions
    for (const key of keysToTraverse) {
      const nameExtended = this.parseDeepServiceName(name, key);
      const deepDefinition = grpcDefinition[key];

      const isServiceDefined =
        deepDefinition && !isUndefined(deepDefinition.service);
      const isServiceBoolean = isServiceDefined
        ? deepDefinition.service !== false
        : false;

      if (isServiceDefined && isServiceBoolean) {
        accumulator.push({
          name: nameExtended,
          service: deepDefinition,
        });
      }
      // Continue recursion until objects end or service definition found
      else {
        this.collectDeepServices(nameExtended, deepDefinition, accumulator);
      }
    }
  }

  private parseDeepServiceName(name: string, key: string): string {
    // If depth is zero then just return key
    if (name.length === 0) {
      return key;
    }
    // Otherwise add next through dot syntax
    return name + '.' + key;
  }
}
