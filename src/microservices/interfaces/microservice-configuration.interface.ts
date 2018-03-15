import { Transport } from '../enums/transport.enum';
import { CustomTransportStrategy } from './custom-transport-strategy.interface';
import { Server } from './../server/server';

export interface MicroserviceOptions {
  transport?: Transport;
  url?: string;
  port?: number;
  host?: string;
  retryAttempts?: number;
  retryDelay?: number;
  strategy?: Server & CustomTransportStrategy;
}
