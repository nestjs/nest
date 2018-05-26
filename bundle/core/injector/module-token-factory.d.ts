import { DynamicModule } from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces/type.interface';
export declare class ModuleTokenFactory {
    create(metatype: Type<any>, scope: Type<any>[], dynamicModuleMetadata?: Partial<DynamicModule> | undefined): string;
    getDynamicMetadataToken(dynamicModuleMetadata: Partial<DynamicModule> | undefined): string;
    getModuleName(metatype: Type<any>): string;
    getScopeStack(scope: Type<any>[]): string[];
    private reflectScope(metatype);
}
