import { NestGateway } from './interfaces/nest-gateway.interface';
import { MetadataScanner } from '@nestjs/core/metadata-scanner';
import { Observable } from 'rxjs/Observable';
export declare class GatewayMetadataExplorer {
  private readonly metadataScanner;
  constructor(metadataScanner: MetadataScanner);
  explore(instance: NestGateway): MessageMappingProperties[];
  exploreMethodMetadata(
    instancePrototype: any,
    methodName: string,
  ): MessageMappingProperties;
  scanForServerHooks(instance: NestGateway): IterableIterator<string>;
}
export interface MessageMappingProperties {
  message: any;
  callback: (...args) => Observable<any> | Promise<any> | any;
}
