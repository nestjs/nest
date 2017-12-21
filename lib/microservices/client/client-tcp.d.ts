import { ClientProxy } from './client-proxy';
import { ClientMetadata } from '../interfaces/client-metadata.interface';
export declare class ClientTCP extends ClientProxy {
  private readonly logger;
  private readonly port;
  private readonly host;
  private isConnected;
  private socket;
  constructor({ port, host }: ClientMetadata);
  init(callback: (...args) => any): Promise<{}>;
  protected sendSingleMessage(
    msg: any,
    callback: (...args) => any
  ): Promise<void>;
  handleResponse(socket: any, callback: (...args) => any, buffer: any): void;
  createSocket(): any;
  close(): void;
  bindEvents(socket: any, callback: (...args) => any): void;
}
