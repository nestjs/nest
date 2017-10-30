import { Metatype } from '../interfaces/metatype.interface';
import { isFunction } from '../utils/shared.utils';

export const filterMiddlewares = (middlewares) => {
    return [].concat(middlewares)
        .filter(isFunction)
        .map((middleware) => mapToClass(middleware));
};

export const mapToClass = (middleware) => {
    if (this.isClass(middleware)) {
        return middleware;
    }
    return assignToken(class {
        public resolve = (...args) => (req, res, next) => middleware(req, res, next);
    });
};

export const isClass = (middleware) => {
    return middleware.toString().substring(0, 5) === 'class';
};

export const assignToken = (metatype): Metatype<any> => {
    this.id = this.id || 1;
    Object.defineProperty(metatype, 'name', { value: ++this.id });
    return metatype;
};
