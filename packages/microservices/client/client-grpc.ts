import { Logger } from '@nestjs/common/services/logger.service';
import { loadPackage } from '@nestjs/common/utils/load-package.util';
import { Observable } from 'rxjs';
import { GRPC_DEFAULT_URL } from '../constants';
import { InvalidGrpcPackageException } from '../exceptions/errors/invalid-grpc-package.exception';
import { InvalidGrpcServiceException } from '../exceptions/errors/invalid-grpc-service.exception';
import { InvalidProtoDefinitionException } from '../exceptions/errors/invalid-proto-definition.exception';
import { ClientGrpc, GrpcOptions } from '../interfaces';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { ClientProxy } from './client-proxy';
import { GRPC_CANCELLED } from './constants';

let grpcPackage: any = {};
let grpcProtoLoaderPackage: any = {};

export class ClientGrpcProxy extends ClientProxy implements ClientGrpc {
  private readonly logger = new Logger(ClientProxy.name);
  private readonly url: string;
  private grpcClient: any;

  constructor(private readonly options: ClientOptions) {
    super();
    this.url =
      this.getOptionsProp<GrpcOptions>(options, 'url') || GRPC_DEFAULT_URL;

    grpcPackage = loadPackage('grpc', ClientGrpcProxy.name);
    grpcProtoLoaderPackage = loadPackage('@grpc/proto-loader', ClientGrpcProxy.name);
    this.grpcClient = this.createClient();
  }

  public getService<T extends {}>(name: string): T {
    const { options } = this.options as GrpcOptions;
    if (!this.grpcClient[name]) {
      throw new InvalidGrpcServiceException();
    }
    const grpcClient = new this.grpcClient[name](
      this.url,
      options.credentials || grpcPackage.credentials.createInsecure(),
      options,
    );
    const protoMethods = Object.keys(this.grpcClient[name].prototype);
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
  ): (...args) => Observable<any> {
    return client[methodName].responseStream
      ? this.createStreamServiceMethod(client, methodName)
      : this.createUnaryServiceMethod(client, methodName);
  }

  public createStreamServiceMethod(
    client: any,
    methodName: string,
  ): (...args) => Observable<any> {
    return (...args) => {
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
        return () => {
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
  ): (...args) => Observable<any> {
    return (...args) => {
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

  public createClient(): any {
    const grpcContext = this.loadProto();
    const packageName = this.getOptionsProp<GrpcOptions>(
      this.options,
      'package',
    );
    const grpcPkg = this.lookupPackage(grpcContext, packageName);
    if (!grpcPkg) {
      const invalidPackageError = new InvalidGrpcPackageException();
      this.logger.error(invalidPackageError.message, invalidPackageError.stack);
      throw invalidPackageError;
    }
    return grpcPkg;
  }

  public loadProto(): any {
    try {
      const file = this.getOptionsProp<GrpcOptions>(this.options, 'protoPath');
      const loader = this.getOptionsProp<GrpcOptions>(this.options, 'loader');

      const packageDefinition = grpcProtoLoaderPackage.loadSync(file, loader);
      const packageObject = grpcPackage.loadPackageDefinition(packageDefinition);
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
    this.grpcClient && this.grpcClient.close();
    this.grpcClient = null;
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

  protected publish(partialPacket, callback: (packet) => any) {
    throw new Error(
      'Method is not supported in gRPC mode. Use ClientGrpc instead (learn more in the documentation).',
    );
  }
}
