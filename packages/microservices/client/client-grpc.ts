import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isFunction, isObject } from '@nestjs/common/utils/shared.utils';
import { Observable, Subscription } from 'rxjs';
import { GRPC_DEFAULT_PROTO_LOADER, GRPC_DEFAULT_URL } from '../constants';
import { InvalidGrpcPackageException } from '../errors/invalid-grpc-package.exception';
import { InvalidGrpcServiceException } from '../errors/invalid-grpc-service.exception';
import { InvalidProtoDefinitionException } from '../errors/invalid-proto-definition.exception';
import { ClientGrpc, GrpcOptions } from '../interfaces';
import { ClientProxy } from './client-proxy';
import { GRPC_CANCELLED } from './constants';
import { ChannelOptions } from '../external/grpc-options.interface';

let grpcPackage: any = {};
let grpcProtoLoaderPackage: any = {};

/**
 * @publicApi
 */
export class ClientGrpcProxy extends ClientProxy implements ClientGrpc {
  protected readonly logger = new Logger(ClientProxy.name);
  protected readonly clients = new Map<string, any>();
  protected readonly url: string;
  protected grpcClients = [];

  constructor(protected readonly options: GrpcOptions['options']) {
    super();
    this.url = this.getOptionsProp(options, 'url') || GRPC_DEFAULT_URL;

    const protoLoader =
      this.getOptionsProp(options, 'protoLoader') || GRPC_DEFAULT_PROTO_LOADER;

    grpcPackage = loadPackage('@grpc/grpc-js', ClientGrpcProxy.name, () =>
      require('@grpc/grpc-js'),
    );

    grpcProtoLoaderPackage = loadPackage(
      protoLoader,
      ClientGrpcProxy.name,
      () =>
        protoLoader === GRPC_DEFAULT_PROTO_LOADER
          ? require('@grpc/proto-loader')
          : require(protoLoader),
    );
    this.grpcClients = this.createClients();
  }

  public getService<T extends {}>(name: string): T {
    const grpcClient = this.createClientByServiceName(name);
    const clientRef = this.getClient(name);
    if (!clientRef) {
      throw new InvalidGrpcServiceException(name);
    }

    const protoMethods = Object.keys(clientRef[name].prototype);
    const grpcService = {} as T;

    protoMethods.forEach(m => {
      grpcService[m] = this.createServiceMethod(grpcClient, m);
    });
    return grpcService;
  }

  public getClientByServiceName<T = unknown>(name: string): T {
    return this.clients.get(name) || this.createClientByServiceName(name);
  }

  public createClientByServiceName(name: string) {
    const clientRef = this.getClient(name);
    if (!clientRef) {
      throw new InvalidGrpcServiceException(name);
    }

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

    const keepaliveOptions = this.getKeepaliveOptions();
    const options: Record<string, string | number> = {
      ...channelOptions,
      ...keepaliveOptions,
    };

    const credentials =
      this.options.credentials || grpcPackage.credentials.createInsecure();

    const grpcClient = new clientRef[name](this.url, credentials, options);
    this.clients.set(name, grpcClient);
    return grpcClient;
  }

  public getKeepaliveOptions() {
    if (!isObject(this.options.keepalive)) {
      return {};
    }
    const keepaliveKeys: Record<
      keyof GrpcOptions['options']['keepalive'],
      string
    > = {
      keepaliveTimeMs: 'grpc.keepalive_time_ms',
      keepaliveTimeoutMs: 'grpc.keepalive_timeout_ms',
      keepalivePermitWithoutCalls: 'grpc.keepalive_permit_without_calls',
      http2MaxPingsWithoutData: 'grpc.http2.max_pings_without_data',
      http2MinTimeBetweenPingsMs: 'grpc.http2.min_time_between_pings_ms',
      http2MinPingIntervalWithoutDataMs:
        'grpc.http2.min_ping_interval_without_data_ms',
      http2MaxPingStrikes: 'grpc.http2.max_ping_strikes',
    };

    const keepaliveOptions = {};
    for (const [optionKey, optionValue] of Object.entries(
      this.options.keepalive,
    )) {
      const key = keepaliveKeys[optionKey];
      if (key === undefined) {
        continue;
      }
      keepaliveOptions[key] = optionValue;
    }
    return keepaliveOptions;
  }

  public createServiceMethod(
    client: any,
    methodName: string,
  ): (...args: unknown[]) => Observable<unknown> {
    return client[methodName].responseStream
      ? this.createStreamServiceMethod(client, methodName)
      : this.createUnaryServiceMethod(client, methodName);
  }

  public createStreamServiceMethod(
    client: unknown,
    methodName: string,
  ): (...args: any[]) => Observable<any> {
    return (...args: any[]) => {
      const isRequestStream = client[methodName].requestStream;
      const stream = new Observable(observer => {
        let isClientCanceled = false;
        let upstreamSubscription: Subscription;

        const upstreamSubjectOrData = args[0];
        const maybeMetadata = args[1];

        const isUpstreamSubject =
          upstreamSubjectOrData && isFunction(upstreamSubjectOrData.subscribe);

        const call =
          isRequestStream && isUpstreamSubject
            ? client[methodName](maybeMetadata)
            : client[methodName](...args);

        if (isRequestStream && isUpstreamSubject) {
          upstreamSubscription = upstreamSubjectOrData.subscribe(
            (val: unknown) => call.write(val),
            (err: unknown) => call.emit('error', err),
            () => call.end(),
          );
        }
        call.on('data', (data: any) => observer.next(data));
        call.on('error', (error: any) => {
          if (error.details === GRPC_CANCELLED) {
            call.destroy();
            if (isClientCanceled) {
              return;
            }
          }
          observer.error(this.serializeError(error));
        });
        call.on('end', () => {
          if (upstreamSubscription) {
            upstreamSubscription.unsubscribe();
            upstreamSubscription = null;
          }
          call.removeAllListeners();
          observer.complete();
        });
        return () => {
          if (upstreamSubscription) {
            upstreamSubscription.unsubscribe();
            upstreamSubscription = null;
          }

          if (call.finished) {
            return undefined;
          }
          isClientCanceled = true;
          call.cancel();
        };
      });
      return stream;
    };
  }

  public createUnaryServiceMethod(
    client: any,
    methodName: string,
  ): (...args: any[]) => Observable<any> {
    return (...args: any[]) => {
      const isRequestStream = client[methodName].requestStream;
      const upstreamSubjectOrData = args[0];
      const isUpstreamSubject =
        upstreamSubjectOrData && isFunction(upstreamSubjectOrData.subscribe);

      if (isRequestStream && isUpstreamSubject) {
        return new Observable(observer => {
          const callArgs = [
            (error: unknown, data: unknown) => {
              if (error) {
                return observer.error(this.serializeError(error));
              }
              observer.next(data);
              observer.complete();
            },
          ];
          const maybeMetadata = args[1];
          if (maybeMetadata) {
            callArgs.unshift(maybeMetadata);
          }
          const call = client[methodName](...callArgs);

          const upstreamSubscription: Subscription =
            upstreamSubjectOrData.subscribe(
              (val: unknown) => call.write(val),
              (err: unknown) => call.emit('error', err),
              () => call.end(),
            );

          return () => {
            upstreamSubscription.unsubscribe();
          };
        });
      }
      return new Observable(observer => {
        const call = client[methodName](...args, (error: any, data: any) => {
          if (error) {
            return observer.error(this.serializeError(error));
          }
          observer.next(data);
          observer.complete();
        });

        return () => {
          if (!call.finished) {
            call.cancel();
          }
        };
      });
    };
  }

  public createClients(): any[] {
    const grpcContext = this.loadProto();
    const packageOption = this.getOptionsProp(this.options, 'package');
    const grpcPackages = [];
    const packageNames = Array.isArray(packageOption)
      ? packageOption
      : [packageOption];

    for (const packageName of packageNames) {
      const grpcPkg = this.lookupPackage(grpcContext, packageName);

      if (!grpcPkg) {
        const invalidPackageError = new InvalidGrpcPackageException(
          packageName,
        );
        this.logger.error(
          invalidPackageError.message,
          invalidPackageError.stack,
        );
        throw invalidPackageError;
      }
      grpcPackages.push(grpcPkg);
    }
    return grpcPackages;
  }

  public loadProto(): any {
    try {
      const file = this.getOptionsProp(this.options, 'protoPath');
      const loader = this.getOptionsProp(this.options, 'loader');

      const packageDefinition =
        this.getOptionsProp(this.options, 'packageDefinition') ||
        grpcProtoLoaderPackage.loadSync(file, loader);

      const packageObject =
        grpcPackage.loadPackageDefinition(packageDefinition);
      return packageObject;
    } catch (err) {
      const invalidProtoError = new InvalidProtoDefinitionException(err.path);
      const message =
        err && err.message ? err.message : invalidProtoError.message;

      this.logger.error(message, invalidProtoError.stack);
      throw invalidProtoError;
    }
  }

  public lookupPackage(root: any, packageName: string) {
    /** Reference: https://github.com/kondi/rxjs-grpc */
    let pkg = root;

    if (packageName) {
      for (const name of packageName.split('.')) {
        pkg = pkg[name];
      }
    }

    return pkg;
  }

  public close() {
    this.grpcClients
      .filter(client => client && isFunction(client.close))
      .forEach(client => client.close());
    this.grpcClients = [];
  }

  public async connect(): Promise<any> {
    throw new Error('The "connect()" method is not supported in gRPC mode.');
  }

  public send<TResult = any, TInput = any>(
    pattern: any,
    data: TInput,
  ): Observable<TResult> {
    throw new Error(
      'Method is not supported in gRPC mode. Use ClientGrpc instead (learn more in the documentation).',
    );
  }

  protected getClient(name: string): any {
    return this.grpcClients.find(client => client.hasOwnProperty(name));
  }

  protected publish(packet: any, callback: (packet: any) => any): any {
    throw new Error(
      'Method is not supported in gRPC mode. Use ClientGrpc instead (learn more in the documentation).',
    );
  }

  protected async dispatchEvent(packet: any): Promise<any> {
    throw new Error(
      'Method is not supported in gRPC mode. Use ClientGrpc instead (learn more in the documentation).',
    );
  }
}
