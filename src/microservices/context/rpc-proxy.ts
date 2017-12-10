import { Observable } from 'rxjs/Observable';
import { RpcExceptionsHandler } from '../exceptions/rpc-exceptions-handler';

export class RpcProxy {
    public create(
        targetCallback: (data: any) => Promise<Observable<any>>,
        exceptionsHandler: RpcExceptionsHandler): (data: any) => Promise<Observable<any>> {

        return async (data) => {
            try {
                return await targetCallback(data);
            }
            catch (e) {
                return exceptionsHandler.handle(e);
            }
        };
    }
}
