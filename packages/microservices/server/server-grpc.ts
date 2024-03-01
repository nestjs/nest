import {
  isObject,
  isString,
  isUndefined,
} from '@nestjs/common/utils/shared.utils';
import {
  EMPTY,
  Observable,
  Subject,
  Subscription,
  defaultIfEmpty,
  fromEvent,
  lastValueFrom,
} from 'rxjs';
import { catchError, takeUntil } from 'rxjs/operators';
import {
  CANCEL_EVENT,
  GRPC_DEFAULT_PROTO_LOADER,
  GRPC_DEFAULT_URL,
} from '../constants';
import { GrpcMethodStreamingType } from '../decorators';
import { Transport } from '../enums';
import { InvalidGrpcPackageException } from '../errors/invalid-grpc-package.exception';
import { InvalidProtoDefinitionException } from '../errors/invalid-proto-definition.exception';
import { ChannelOptions } from '../external/grpc-options.interface';
import { getGrpcPackageDefinition } from '../helpers';
import { CustomTransportStrategy, MessageHandler } from '../interfaces';
import { GrpcOptions } from '../interfaces/microservice-configuration.interface';
import { Server } from './server';

let grpcPackage: any = {};
let grpcProtoLoaderPackage: any = {};

interface GrpcCall<TRequest = any, TMetadata = any> {
  request: TRequest;
  metadata: TMetadata;
  sendMetadata: Function;
  end: Function;
  write: Function;
  on: Function;
  off: Function;
  emit: Function;
}

export class ServerGrpc extends Server implements CustomTransportStrategy {
  public readonly transportId = Transport.GRPC;

  private readonly url: string;
  private grpcClient: any;

  constructor(private readonly options: GrpcOptions['options']) {
    super();
    this.url = this.getOptionsProp(options, 'url') || GRPC_DEFAULT_URL;

    const protoLoader =
      this.getOptionsProp(options, 'protoLoader') || GRPC_DEFAULT_PROTO_LOADER;

    grpcPackage = this.loadPackage('@grpc/grpc-js', ServerGrpc.name, () =>
      require('@grpc/grpc-js'),
    );
    grpcProtoLoaderPackage = this.loadPackage(
      protoLoader,
      ServerGrpc.name,
      () =>
        protoLoader === GRPC_DEFAULT_PROTO_LOADER
          ? require('@grpc/proto-loader')
          : require(protoLoader),
    );
  }

  public async listen(
    callback: (err?: unknown, ...optionalParams: unknown[]) => void,
  ) {
    try {
      this.grpcClient = await this.createClient();
      await this.start(callback);
    } catch (err) {
      callback(err);
    }
  }

  public async start(callback?: () => void) {
    await this.bindEvents();
    this.grpcClient.start();
    callback();
  }

  public async bindEvents() {
    const grpcContext = this.loadProto();
    const packageOption = this.getOptionsProp(this.options, 'package');
    const packageNames = Array.isArray(packageOption)
      ? packageOption
      : [packageOption];

    for (const packageName of packageNames) {
      const grpcPkg = this.lookupPackage(grpcContext, packageName);
      await this.createServices(grpcPkg, packageName);
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
   * @param streamType
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
      if (streamType === GrpcMethodStreamingType.RX_STREAMING) {
        return this.createRequestStreamMethod(
          methodHandler,
          protoNativeHandler.responseStream,
        );
      }
      // If any handlers were defined with GrpcStreamCall annotation
      else if (streamType === GrpcMethodStreamingType.PT_STREAMING) {
        return this.createStreamCallMethod(
          methodHandler,
          protoNativeHandler.responseStream,
        );
      }
    }
    return protoNativeHandler.responseStream
      ? this.createStreamServiceMethod(methodHandler)
      : this.createUnaryServiceMethod(methodHandler);
  }

  public createUnaryServiceMethod(methodHandler: Function): Function {
    return async (call: GrpcCall, callback: Function) => {
      const handler = methodHandler(call.request, call.metadata, call);
      this.transformToObservable(await handler).subscribe({
        next: async data => callback(null, await data),
        error: (err: any) => callback(err),
      });
    };
  }

  public createStreamServiceMethod(methodHandler: Function): Function {
    return async (call: GrpcCall, callback: Function) => {
      const handler = methodHandler(call.request, call.metadata, call);
      const result$ = this.transformToObservable(await handler);

      try {
        await this.writeObservableToGrpc(result$, call);
      } catch (err) {
        call.emit('error', err);
        return;
      }
    };
  }

  /**
   * Writes an observable to a GRPC call.
   *
   * This function will ensure that backpressure is managed while writing values
   * that come from an observable to a GRPC call.
   *
   * @param source The observable we want to write out to the GRPC call.
   * @param call The GRPC call we want to write to.
   * @returns A promise that resolves when we're done writing to the call.
   */
  public writeObservableToGrpc<T>(
    source: Observable<T>,
    call: GrpcCall<T>,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const valuesWaitingToBeDrained: T[] = [];
      let shouldErrorAfterDraining = false;
      let error: any;
      let shouldResolveAfterDraining = false;
      let writing = true;

      // Used to manage finalization
      const subscription = new Subscription();

      // If the call is cancelled, unsubscribe from the source
      const cancelHandler = () => {
        subscription.unsubscribe();
        // The call has been cancelled, so we need to either resolve
        // or reject the promise. We're resolving in this case because
        // rejection is noisy. If at any point in the future, we need to
        // know that cancellation happened, we can either reject or
        // start resolving with some sort of outcome value.
        resolve();
      };
      call.on(CANCEL_EVENT, cancelHandler);
      subscription.add(() => call.off(CANCEL_EVENT, cancelHandler));

      // In all cases, when we finalize, end the writable stream
      subscription.add(() => call.end());

      const drain = () => {
        writing = true;
        while (valuesWaitingToBeDrained.length > 0) {
          const value = valuesWaitingToBeDrained.shift()!;
          if (writing) {
            // The first time `call.write` returns false, we need to stop.
            // It wrote the value, but it won't write anything else.
            writing = call.write(value);
            if (!writing) {
              // We can't write anymore so we need to wait for the drain event
              return;
            }
          }
        }

        if (shouldResolveAfterDraining) {
          subscription.unsubscribe();
          resolve();
        } else if (shouldErrorAfterDraining) {
          call.emit('error', error);
          subscription.unsubscribe();
          reject(error);
        }
      };

      call.on('drain', drain);
      subscription.add(() => call.off('drain', drain));

      subscription.add(
        source.subscribe({
          next(value) {
            if (writing) {
              writing = call.write(value);
            } else {
              // If we can't write, that's because we need to
              // wait for the drain event before we can write again
              // buffer the value and wait for the drain event
              valuesWaitingToBeDrained.push(value);
            }
          },
          error(err) {
            if (valuesWaitingToBeDrained.length === 0) {
              // We're not waiting for a drain event, so we can just
              // reject and teardown.
              call.emit('error', err);
              subscription.unsubscribe();
              reject(err);
            } else {
              // We're waiting for a drain event, record the
              // error so it can be handled after everything is drained.
              shouldErrorAfterDraining = true;
              error = err;
            }
          },
          complete() {
            if (valuesWaitingToBeDrained.length === 0) {
              // We're not waiting for a drain event, so we can just
              // resolve and teardown.
              subscription.unsubscribe();
              resolve();
            } else {
              shouldResolveAfterDraining = true;
            }
          },
        }),
      );
    });
  }

  public createRequestStreamMethod(
    methodHandler: Function,
    isResponseStream: boolean,
  ) {
    return async (
      call: GrpcCall,
      callback: (err: unknown, value: unknown) => void,
    ) => {
      const req = new Subject<any>();
      call.on('data', (m: any) => req.next(m));
      call.on('error', (e: any) => {
        // Check if error means that stream ended on other end
        const isCancelledError = String(e).toLowerCase().indexOf('cancelled');

        if (isCancelledError) {
          call.end();
          return;
        }
        // If another error then just pass it along
        req.error(e);
      });
      call.on('end', () => req.complete());

      const handler = methodHandler(req.asObservable(), call.metadata, call);
      const res = this.transformToObservable(await handler);
      if (isResponseStream) {
        try {
          await this.writeObservableToGrpc(res, call);
        } catch (err) {
          call.emit('error', err);
          return;
        }
      } else {
        const response = await lastValueFrom(
          res.pipe(
            takeUntil(fromEvent(call as any, CANCEL_EVENT)),
            catchError(err => {
              callback(err, null);
              return EMPTY;
            }),
            defaultIfEmpty(undefined),
          ),
        );

        if (!isUndefined(response)) {
          callback(null, response);
        }
      }
    };
  }

  public createStreamCallMethod(
    methodHandler: Function,
    isResponseStream: boolean,
  ) {
    return async (
      call: GrpcCall,
      callback: (err: unknown, value: unknown) => void,
    ) => {
      if (isResponseStream) {
        methodHandler(call);
      } else {
        methodHandler(call, callback);
      }
    };
  }

  public async close(): Promise<void> {
    if (this.grpcClient) {
      const graceful = this.getOptionsProp(this.options, 'gracefulShutdown');
      if (graceful) {
        await new Promise<void>((resolve, reject) => {
          this.grpcClient.tryShutdown((error: Error) => {
            if (error) reject(error);
            else resolve();
          });
        });
      } else {
        this.grpcClient.forceShutdown();
      }
    }
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
    pattern: unknown,
    callback: MessageHandler,
    isEventHandler = false,
  ) {
    const route = isString(pattern) ? pattern : JSON.stringify(pattern);
    callback.isEventHandler = isEventHandler;
    this.messageHandlers.set(route, callback);
  }

  public async createClient(): Promise<any> {
    const channelOptions: ChannelOptions =
      this.options && this.options.channelOptions
        ? this.options.channelOptions
        : {};
    if (this.options && this.options.maxSendMessageLength) {
      channelOptions['grpc.max_send_message_length'] =
        this.options.maxSendMessageLength;
    }
    if (this.options && this.options.maxReceiveMessageLength) {
      channelOptions['grpc.max_receive_message_length'] =
        this.options.maxReceiveMessageLength;
    }
    if (this.options && this.options.maxMetadataSize) {
      channelOptions['grpc.max_metadata_size'] = this.options.maxMetadataSize;
    }
    const server = new grpcPackage.Server(channelOptions);
    const credentials = this.getOptionsProp(this.options, 'credentials');

    await new Promise((resolve, reject) => {
      server.bindAsync(
        this.url,
        credentials || grpcPackage.ServerCredentials.createInsecure(),
        (error: Error | null, port: number) =>
          error ? reject(error) : resolve(port),
      );
    });

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
      const packageDefinition = getGrpcPackageDefinition(
        this.options,
        grpcProtoLoaderPackage,
      );
      return grpcPackage.loadPackageDefinition(packageDefinition);
    } catch (err) {
      const invalidProtoError = new InvalidProtoDefinitionException(err.path);
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

  private async createServices(grpcPkg: any, packageName: string) {
    if (!grpcPkg) {
      const invalidPackageError = new InvalidGrpcPackageException(packageName);
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
