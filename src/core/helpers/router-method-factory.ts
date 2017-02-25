import { RequestMethod } from '../../common/enums/request-method.enum';

export class RouterMethodFactory {
    get(target, requestMethod: RequestMethod) {
        switch(requestMethod) {
            case RequestMethod.POST: return target.post;
            case RequestMethod.ALL: return target.all;
            case RequestMethod.DELETE: return target.delete;
            case RequestMethod.PUT: return target.put;
            default: {
                return target.get;
            }
        }
    }
}