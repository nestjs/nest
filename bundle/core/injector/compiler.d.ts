import { DynamicModule, Type } from '@nestjs/common/interfaces';
export interface ModuleFactory {
    type: Type<any>;
    token: string;
    dynamicMetadata?: Partial<DynamicModule> | undefined;
}
export declare class ModuleCompiler {
    private readonly moduleTokenFactory;
    compile(metatype: Type<any> | DynamicModule | Promise<DynamicModule>, scope: Type<any>[]): Promise<ModuleFactory>;
    extractMetadata(metatype: Type<any> | DynamicModule | Promise<DynamicModule>): Promise<{
        type: Type<any>;
        dynamicMetadata?: Partial<DynamicModule> | undefined;
    }>;
    isDynamicModule(module: Type<any> | DynamicModule): module is DynamicModule;
}
