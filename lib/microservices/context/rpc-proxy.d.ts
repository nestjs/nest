import { Observable } from 'rxjs/Observable';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler';
export declare class RpcProxy {
    create(targetCallback: (data) => Promise<Observable<any>>, exceptionsHandler: RpcExceptionsHandler): (data) => Promise<Observable<any>>;
}
