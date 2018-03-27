/// <reference types="node" />
import { Server } from './server';
import { CustomTransportStrategy, ReadPacket } from './../interfaces';
import { MicroserviceOptions } from '../interfaces/microservice-configuration.interface';
import { PacketId } from './../interfaces';
export declare class ServerTCP extends Server
  implements CustomTransportStrategy {
  private readonly options;
  private readonly port;
  private server;
  private isExplicitlyTerminated;
  private retryAttemptsCount;
  constructor(options: MicroserviceOptions);
  listen(callback: () => void): void;
  close(): void;
  bindHandler(socket: any): void;
  handleMessage(socket: any, packet: ReadPacket & PacketId): Promise<any>;
  handleClose(): undefined | number | NodeJS.Timer;
  private init();
  private getSocketInstance(socket);
}
