import { RequestMethod } from '@nestjs/common';
import 'rxjs/add/operator/toPromise';
export declare class RouterResponseController {
    apply(resultOrDeffered: any, response: any, httpStatusCode: number): Promise<any>;
    transformToResult(resultOrDeffered: any): Promise<any>;
    getStatusByMethod(requestMethod: RequestMethod): number;
}
