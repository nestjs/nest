import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { isObject } from '@nestjs/common/utils/shared.utils';
import { Observable } from 'rxjs';
import { GRPC_DEFAULT_PROTO_LOADER, GRPC_DEFAULT_URL } from '../constants';
import { InvalidGrpcPackageException } from '../errors/invalid-grpc-package.exception';
import { InvalidGrpcServiceException } from '../errors/invalid-grpc-service.exception';
import { InvalidProtoDefinitionException } from '../errors/invalid-proto-definition.exception';
import { ClientGrpc, GrpcOptions } from '../interfaces';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { ClientProxy } from './client-proxy';
import { GRPC_CANCELLED } from './constants';

let grpcPackage: any = {};
let grpcProtoLoaderPackage: any = {};

export class ClientGrpcProxy extends ClientProxy implements ClientGrpc {
  protected readonly logger = new Logger(ClientProxy.name);
  protected readonly url: string;
  protected grpcClientMap: { [key: string]: any };

  constructor(protected readonly options: ClientOptions['options']) {
    super();
    this.url =
      this.getOptionsProp<GrpcOptions>(options, 'url') || GRPC_DEFAULT_URL;

    const protoLoader =
      this.getOptionsProp<GrpcOptions>(options, 'protoLoader') ||
      GRPC_DEFAULT_PROTO_LOADER;

    grpcPackage = loadPackage('grpc', ClientGrpcProxy.name, () =>
      require('grpc'),
    );
    grpcProtoLoaderPackage = loadPackage(protoLoader, ClientGrpcProxy.name);
    this.grpcClientMap = this.createClients();
  }

  public getService<T extends {}>(name: string, pkgName?: string): T {
    const options: any = isObject(this.options)
      ? { ...this.options, loader: '' }
      : {};

    let candidateClient: any = null;
    let TargetClient: any = null;
    if (pkgName) {
      candidateClient = this.grpcClientMap[pkgName];
      TargetClient = candidateClient && candidateClient[name];
    } else {
      for (const instance of Object.values(this.grpcClientMap)) {
        if (instance[name]) {
          TargetClient = instance[name];
          break;
        }
      }
    }
    if (!TargetClient) {
      throw new InvalidGrpcServiceException();
    }
    const grpcClient = new TargetClient(
      this.url,
      options.credentials || grpcPackage.credentials.createInsecure(),
      options,
    );
    const protoMethods = Object.keys(TargetClient.prototype);
    const grpcService = {} as T;
    protoMethods.forEach(m => {
      const key = m[0].toLowerCase() + m.slice(1, m.length);
      grpcService[key] = this.createServiceMethod(grpcClient, m);
    });
    return grpcService;
  }

  public createServiceMethod(
    client: any,
    methodName: string,
  ): (...args: any[]) => Observable<any> {
    return client[methodName].responseStream
      ? this.createStreamServiceMethod(client, methodName)
      : this.createUnaryServiceMethod(client, methodName);
  }

  public createStreamServiceMethod(
    client: any,
    methodName: string,
  ): (...args: any[]) => Observable<any> {
    return (...args: any[]) => {
      return new Observable(observer => {
        let isClientCanceled = false;
        const call = client[methodName](...args);

        call.on('data', (data: any) => observer.next(data));
        call.on('error', (error: any) => {
          if (error.details === GRPC_CANCELLED) {
            call.destroy();
            if (isClientCanceled) {
              return;
            }
          }
          observer.error(error);
        });
        call.on('end', () => {
          call.removeAllListeners();
          observer.complete();
        });
        return (): any => {
          if (call.finished) {
            return undefined;
          }
          isClientCanceled = true;
          call.cancel();
        };
      });
    };
  }

  public createUnaryServiceMethod(
    client: any,
    methodName: string,
  ): (...args: any[]) => Observable<any> {
    return (...args: any[]) => {
      return new Observable(observer => {
        client[methodName](...args, (error: any, data: any) => {
          if (error) {
            return observer.error(error);
          }
          observer.next(data);
          observer.complete();
        });
      });
    };
  }

  public createClients(): any {
    const grpcContext = this.loadProto();
    const packageNames = this.getOptionsProp<GrpcOptions>(
      this.options,
      'packages',
    );
    const grpcPkgs: { [key: string]: any } = {};
    for (const pkgName of packageNames) {
      const grpcPkg = this.lookupPackage(grpcContext, pkgName);
      if (!grpcPkg) {
        const invalidPackageError = new InvalidGrpcPackageException();
        this.logger.error(invalidPackageError.message, invalidPackageError.stack);
        throw invalidPackageError;
      }
      grpcPkgs[pkgName] = grpcPkg;
    }
    return grpcPkgs;
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

  public lookupPackage(root: any, packageName: string) {
    /** Reference: https://github.com/kondi/rxjs-grpc */
    let pkg = root;
    for (const name of packageName.split(/\./)) {
      pkg = pkg[name];
    }
    return pkg;
  }

  public close() {
    if (this.grpcClientMap) {
      Object.values(this.grpcClientMap).forEach((client) => client.close());
    }
    this.grpcClientMap = null;
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
