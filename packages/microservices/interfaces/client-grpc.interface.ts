import { GrpcService } from '../client/client-grpc';

export interface ClientGrpc {
  getService<T extends GrpcService = any>(name: string): T;
}
