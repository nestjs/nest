import { Constructor } from './merge-with-values.util';
import { NestMiddleware } from '../../core/middlewares/interfaces/nest-middleware.interface';

export const BindResolveMiddlewareValues = <T extends Constructor<NestMiddleware>>(data: Array<any>) => {
    return (metatype: T): any => {
        const type = class extends metatype {
            resolve() {
                return super.resolve(...data);
            }
        };
        const token = metatype.name + JSON.stringify(data);
        Object.defineProperty(type, 'name', { value: token });
        return type;
    }
};