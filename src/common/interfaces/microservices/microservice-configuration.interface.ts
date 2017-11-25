import {Transport} from './../../enums/transport.enum';
import {CustomTransportStrategy} from './custom-transport-strategy.interface';

export interface MicroserviceConfiguration {
  transport?: Transport;
  url?: string;
  port?: number;
  host?: string;
  strategy?: CustomTransportStrategy;
}