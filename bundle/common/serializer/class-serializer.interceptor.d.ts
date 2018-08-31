import { ExecutionContext, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { ClassTransformOptions } from '../interfaces/external/class-transform-options.interface';
export interface PlainLiteralObject {
    [key: string]: any;
}
export declare class ClassSerializerInterceptor implements NestInterceptor {
    private readonly reflector;
    constructor(reflector: any);
    intercept(context: ExecutionContext, call$: Observable<any>): Observable<any>;
    serialize(response: PlainLiteralObject | Array<PlainLiteralObject>, options: ClassTransformOptions): PlainLiteralObject | PlainLiteralObject[];
    transformToPlain(plainOrClass: any, options: ClassTransformOptions): PlainLiteralObject;
    private getContextOptions(context);
    private reflectSerializeMetadata(obj);
}
