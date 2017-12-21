import { Transport } from '../enums/transport.enum';
import { CustomTransportStrategy } from './custom-transport-strategy.interface';
import { Server } from './../server/server';

export interface MicroserviceConfiguration {
  transport?: Transport;
  url?: string;
  port?: number;
  host?: string;
  strategy?: Server & CustomTransportStrategy;
}
