import {
  Inject,
  Injectable,
  Injector,
  Type,
  Utils,
  UNHANDLED_RUNTIME_EXCEPTION,
} from '@nest/core';
import { Observable } from 'rxjs';

import { RpcResponseError, RpcResponseReject } from './exceptions';
import { DsClient } from '../ds-client.interface';
import { DEEPSTREAM_CLIENT } from '../tokens';
import { RPCResponse } from '../deepstream';
import { RpcStorage } from './rpc.storage';
import { RpcProvider } from './interfaces';

export type ProvideCallback = <T>(
  data: any,
  response: RPCResponse,
) => Observable<T> | Promise<T> | T;

@Injectable()
export class DsRpcService {
  @Inject(DEEPSTREAM_CLIENT)
  private readonly client!: DsClient;

  constructor(private readonly injector: Injector) {}

  public emit<T>(event: string, data?: any): Promise<T> {
    return Utils.promisify(this.client.rpc.make)(event, data);
  }

  public on(event: string, callback: ProvideCallback) {
    this.client.rpc.provide(event, async (data, response) => {
      response.autoAck = false;

      await this.rpcResponseZone(response, async () => {
        const result = callback(data, response);
        return await Utils.transformResult(result);
      });
    });
  }

  private async rpcResponseZone(
    response: RPCResponse,
    run: () => Promise<any>,
  ) {
    try {
      const result = await run();
      return result ? response.send(result) : response.ack();
    } catch (error) {
      if (error instanceof RpcResponseError) {
        return response.error(error.message);
      } else if (error instanceof RpcResponseReject) {
        return response.reject();
      }

      response.error(`Unhandled error: ${error.message}`);
      throw UNHANDLED_RUNTIME_EXCEPTION;
    }
  }

  public async add(providers: Type<RpcProvider>[]) {
    providers.forEach(provider => {
      const rpcProvider = this.injector.get(provider);

      RpcStorage.getEventProvidersByType(provider).forEach(
        ({ method, event }) => {
          this.on(event, (data, response) => {
            return rpcProvider[method](data, response);
          });
        },
      );
    });
  }
}
