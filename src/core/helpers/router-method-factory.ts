import { RequestMethod } from '../../common/enums/request-method.enum';

export class RouterMethodFactory {
    public get(target, requestMethod: RequestMethod) {
        switch (requestMethod) {
            case RequestMethod.POST: return target.post;
            case RequestMethod.ALL: return target.all;
            case RequestMethod.DELETE: return target.delete;
            case RequestMethod.PUT: return target.put;
            case RequestMethod.PATCH: return target.patch;
            default: {
                return target.get;
            }
        }
    }
}