import { Observable } from 'rxjs';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler';
import { RpcProxy } from './rpc-proxy';

export class KafkaRpcProxy extends RpcProxy {
  public create(
    targetCallback: (...args: unknown[]) => Promise<Observable<any>>,
    exceptionsHandler: RpcExceptionsHandler,
  ): (...args: unknown[]) => Promise<Observable<unknown>> {
    return targetCallback;
  }
}
