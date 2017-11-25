import { Metatype } from '@nestjs/common/interfaces';
export declare const filterMiddlewares: (middlewares: any) => any[];
export declare const mapToClass: (middleware: any) => any;
export declare const isClass: (middleware: any) => boolean;
export declare const assignToken: (metatype: any) => Metatype<any>;
