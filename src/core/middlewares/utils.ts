import { NextFunction, Request, Response } from 'express';

import { Metatype } from '@nestjs/common/interfaces';
import { isFunction } from '@nestjs/common/utils/shared.utils';

export const filterMiddlewares = (middlewares: any) => {
    return [].concat(middlewares)
        .filter(isFunction)
        .map((middleware) => mapToClass(middleware));
};

export const mapToClass = (middleware: any) => {
    if (this.isClass(middleware)) {
        return middleware;
    }
    return assignToken(class {
        public resolve = (...args: any[]) => (req: Request & any, res: Response & any, next: NextFunction) => middleware(req, res, next);
    });
};

export const isClass = (middleware: any) => {
    return middleware.toString().substring(0, 5) === 'class';
};

export const assignToken = (metatype: Metatype<any>): Metatype<any> => {
    this.id = this.id || 1;
    Object.defineProperty(metatype, 'name', { value: ++this.id });
    return metatype;
};
