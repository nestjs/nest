import {Transport} from './../enums/transport.enum';

export interface ClientMetadata {
  transport?: Transport;
  url?: string;
  port?: number;
  host?: string;
}