import { NestContainer } from './injector/container';
import { NestModuleMetatype } from '@nestjs/common/interfaces/modules/module-metatype.interface';
import { Metatype } from '@nestjs/common/interfaces';
import { INestApplicationContext } from '@nestjs/common';
export declare class NestApplicationContext implements INestApplicationContext {
    protected readonly container: NestContainer;
    private readonly scope;
    protected contextModule: any;
    private readonly moduleTokenFactory;
    constructor(container: NestContainer, scope: NestModuleMetatype[], contextModule: any);
    select<T>(module: Metatype<T>): INestApplicationContext;
    get<T>(metatypeOrToken: Metatype<T> | string | symbol): T;
    private findInstanceByPrototypeOrToken<T>(metatypeOrToken);
}
