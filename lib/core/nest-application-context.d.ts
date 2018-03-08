import { NestContainer } from './injector/container';
import { Type } from '@nestjs/common/interfaces/type.interface';
import { INestApplicationContext } from '@nestjs/common';
export declare class NestApplicationContext implements INestApplicationContext {
    protected readonly container: NestContainer;
    private readonly scope;
    protected contextModule: any;
    private readonly moduleTokenFactory;
<<<<<<< HEAD
    constructor(container: NestContainer, scope: Type<any>[], contextModule: any);
    selectContextModule(): void;
    select<T>(module: Type<T>): INestApplicationContext;
    get<T>(typeOrToken: Type<T> | string | symbol): T | null;
    find<T>(typeOrToken: Type<T> | string | symbol): T | null;
    private findInstanceByPrototypeOrToken<T>(metatypeOrToken, contextModule);
=======
    constructor(container: NestContainer, scope: NestModuleMetatype[], contextModule: any);
    selectContextModule(): void;
    select<T>(module: Metatype<T>): INestApplicationContext;
    get<T>(metatypeOrToken: Metatype<T> | string | symbol): T;
    private findInstanceByPrototypeOrToken<T>(metatypeOrToken);
>>>>>>> master
}
