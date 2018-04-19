import { GrpcObject } from 'grpc';
import { ClientProxy } from './client-proxy';
import { Logger } from '@nestjs/common/services/logger.service';
import { ClientOptions } from '../interfaces/client-metadata.interface';
import { GrpcOptions } from './../interfaces';
import { GRPC_DEFAULT_URL } from './../constants';
import { ClientGrpc } from './../interfaces';
import { Observable } from 'rxjs/Observable';
import { InvalidGrpcServiceException } from '../exceptions/invalid-grpc-service.exception';
import { InvalidGrpcPackageException } from '../exceptions/invalid-grpc-package.exception';
import { InvalidProtoDefinitionException } from '../exceptions/invalid-proto-definition.exception';

let grpcPackage: any = {};

export class ClientGrpcProxy extends ClientProxy implements ClientGrpc {
  private readonly logger = new Logger(ClientProxy.name);
  private readonly url: string;
  private grpcClient: any;

  constructor(private readonly options: ClientOptions) {
    super();
    this.url =
      this.getOptionsProp<GrpcOptions>(options, 'url') || GRPC_DEFAULT_URL;

    grpcPackage = this.loadPackage('grpc', ClientGrpcProxy.name);
    this.grpcClient = this.createClient();
  }

  public getService<T = any>(name: string): T {
    var options, credentials;
    if (!this.grpcClient[name]) {
      throw new InvalidGrpcServiceException();
    }
    const grpcClient = new this.grpcClient[name](
      this.url,
      credentials || grpcPackage.credentials.createInsecure(),
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
        const call = client[methodName](...args);
        call.on('data', (data: any) => observer.next(data));
        call.on('error', (error: any) => observer.error(error));
        call.on('end', () => observer.complete());
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
    const grpcPackage = this.lookupPackage(grpcContext, packageName);
    if (!grpcPackage) {
      throw new InvalidGrpcPackageException();
    }
    return grpcPackage;
  }

  public loadProto(): GrpcObject {
    try {
      const context = grpcPackage.load(
        this.getOptionsProp<GrpcOptions>(this.options, 'protoPath'),
      );
      return context;
    } catch (e) {
      throw new InvalidProtoDefinitionException();
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

  protected async publish(partialPacket, callback: (packet) => any) {
    throw new Error(
      'Method is not supported in gRPC mode. Use ClientGrpc instead (learn more in the documentation).',
    );
  }
}
