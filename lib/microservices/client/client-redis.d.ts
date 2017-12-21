import * as redis from 'redis';
import { ClientProxy } from './client-proxy';
import { ClientMetadata } from '../interfaces/client-metadata.interface';
export declare class ClientRedis extends ClientProxy {
  private readonly logger;
  private readonly url;
  private pub;
  private sub;
  constructor(metadata: ClientMetadata);
  protected sendSingleMessage(
    msg: any,
    callback: (...args) => any
  ): (channel: any, message: any) => void;
  getAckPatternName(pattern: string): string;
  getResPatternName(pattern: string): string;
  close(): void;
  init(callback: (...args) => any): void;
  createClient(): redis.RedisClient;
  handleErrors(stream: any, callback: (...args) => any): void;
}
