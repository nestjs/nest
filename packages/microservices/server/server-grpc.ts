import {
  isObject,
  isString,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import { EMPTY, fromEvent, Subject } from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import {
  CANCEL_EVENT,
  GRPC_DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH,
  GRPC_DEFAULT_MAX_SEND_MESSAGE_LENGTH,
  GRPC_DEFAULT_PROTO_LOADER,
  GRPC_DEFAULT_URL,
} from '../constants';
import { GrpcMethodStreamingType } from '../decorators';
import { InvalidGrpcPackageException } from '../errors/invalid-grpc-package.exception';
import { InvalidProtoDefinitionException } from '../errors/invalid-proto-definition.exception';
import { CustomTransportStrategy, MessageHandler } from '../interfaces';
import { GrpcOptions } from '../interfaces/microservice-configuration.interface';
import { Server } from './server';

let grpcPackage: any = {};
let grpcProtoLoaderPackage: any = {};

interface GrpcCall<TRequest = any, TMetadata = any> {
  request: TRequest;
  metadata: TMetadata;
  end: Function;
  write: Function;
  on: Function;
  emit: Function;
}

export class ServerGrpc extends Server implements CustomTransportStrategy {
  private readonly url: string;
  private grpcClient: any;

  constructor(private readonly options: GrpcOptions['options']) {
    super();
    this.url = this.getOptionsProp(options, 'url') || GRPC_DEFAULT_URL;

    const protoLoader =
      this.getOptionsProp(options, 'protoLoader') || GRPC_DEFAULT_PROTO_LOADER;

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
    const packageOpt = this.getOptionsProp(this.options, 'package');

    // if packages more then 1
    const packageNames = Array.isArray(packageOpt) ? packageOpt : [packageOpt];

    for (const packageName of packageNames) {
      const grpcPkg = this.lookupPackage(grpcContext, packageName);

      await this.createServices(grpcPkg);
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

  /**
   * Will create service mapping from gRPC generated Object to handlers
   * defined with @GrpcMethod or @GrpcStreamMethod annotations
   *
   * @param grpcService
   * @param name
   */
  public async createService(grpcService: any, name: string) {
    const service = {};

    // tslint:disable-next-line:forin
    for (const methodName in grpcService.prototype) {
      let pattern = '';
      let methodHandler = null;
      let streamingType = GrpcMethodStreamingType.NO_STREAMING;

      const methodFunction = grpcService.prototype[methodName];
      const methodReqStreaming = methodFunction.requestStream;

      if (!isUndefined(methodReqStreaming) && methodReqStreaming) {
        // Try first pattern to be presented, RX streaming pattern would be
        // a preferable pattern to select among a few defined
        pattern = this.createPattern(
          name,
          methodName,
          GrpcMethodStreamingType.RX_STREAMING,
        );
        methodHandler = this.messageHandlers.get(pattern);
        streamingType = GrpcMethodStreamingType.RX_STREAMING;
        // If first pattern didn't match to any of handlers then try
        // pass-through handler to be presented
        if (!methodHandler) {
          pattern = this.createPattern(
            name,
            methodName,
            GrpcMethodStreamingType.PT_STREAMING,
          );
          methodHandler = this.messageHandlers.get(pattern);
          streamingType = GrpcMethodStreamingType.PT_STREAMING;
        }
      } else {
        pattern = this.createPattern(
          name,
          methodName,
          GrpcMethodStreamingType.NO_STREAMING,
        );
        // Select handler if any presented for No-Streaming pattern
        methodHandler = this.messageHandlers.get(pattern);
        streamingType = GrpcMethodStreamingType.NO_STREAMING;
      }
      if (!methodHandler) {
        continue;
      }
      service[methodName] = await this.createServiceMethod(
        methodHandler,
        grpcService.prototype[methodName],
        streamingType,
      );
    }
    return service;
  }

  /**
   * Will create a string of a JSON serialized format
   *
   * @param service name of the service which should be a match to gRPC service definition name
   * @param methodName name of the method which is coming after rpc keyword
   * @param streaming GrpcMethodStreamingType parameter which should correspond to
   * stream keyword in gRPC service request part
   */
  public createPattern(
    service: string,
    methodName: string,
    streaming: GrpcMethodStreamingType,
  ): string {
    return JSON.stringify({
      service,
      rpc: methodName,
      streaming,
    });
  }

  /**
   * Will return async function which will handle gRPC call
   * with Rx streams or as a direct call passthrough
   *
   * @param methodHandler
   * @param protoNativeHandler
   */
  public createServiceMethod(
    methodHandler: Function,
    protoNativeHandler: any,
    streamType: GrpcMethodStreamingType,
  ): Function {
    // If proto handler has request stream as "true" then we expect it to have
    // streaming from the side of requester
    if (protoNativeHandler.requestStream) {
      // If any handlers were defined with GrpcStreamMethod annotation use RX
      if (streamType === GrpcMethodStreamingType.RX_STREAMING)
        return this.createStreamDuplexMethod(methodHandler);
      // If any handlers were defined with GrpcStreamCall annotation
      else if (streamType === GrpcMethodStreamingType.PT_STREAMING)
        return this.createStreamCallMethod(methodHandler);
    }
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
        .pipe(
          takeUntil(fromEvent(call as any, CANCEL_EVENT)),
          catchError(err => {
            call.emit('error', err);
            return EMPTY;
          }),
        )
        .forEach(data => call.write(data));
      call.end();
    };
  }

  public createStreamDuplexMethod(methodHandler: Function) {
    return async (call: GrpcCall) => {
      const req = new Subject<any>();
      call.on('data', (m: any) => req.next(m));
      call.on('error', (e: any) => {
        // Check if error means that stream ended on other end
        if (
          String(e)
            .toLowerCase()
            .indexOf('cancelled') > -1
        ) {
          call.end();
          return;
        }
        // If another error then just pass it along
        req.error(e);
      });
      call.on('end', () => req.complete());

      const handler = methodHandler(req.asObservable());
      const res = this.transformToObservable(await handler);
      await res
        .pipe(
          takeUntil(fromEvent(call as any, CANCEL_EVENT)),
          catchError(err => {
            call.emit('error', err);
            return EMPTY;
          }),
        )
        .forEach(m => call.write(m));

      call.end();
    };
  }

  public createStreamCallMethod(methodHandler: Function) {
    return async (call: GrpcCall) => {
      methodHandler(call);
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

  public addHandler(
    pattern: any,
    callback: MessageHandler,
    isEventHandler = false,
  ) {
    const route = isString(pattern) ? pattern : JSON.stringify(pattern);
    callback.isEventHandler = isEventHandler;
    this.messageHandlers.set(route, callback);
  }

  public createClient(): any {
    const server = new grpcPackage.Server({
      'grpc.max_send_message_length': this.getOptionsProp(
        this.options,
        'maxSendMessageLength',
        GRPC_DEFAULT_MAX_SEND_MESSAGE_LENGTH,
      ),
      'grpc.max_receive_message_length': this.getOptionsProp(
        this.options,
        'maxReceiveMessageLength',
        GRPC_DEFAULT_MAX_RECEIVE_MESSAGE_LENGTH,
      ),
    });
    const credentials = this.getOptionsProp(this.options, 'credentials');
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
      const file = this.getOptionsProp(this.options, 'protoPath');
      const loader = this.getOptionsProp(this.options, 'loader');

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
      throw err;
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

  private async createServices(grpcPkg: any) {
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
