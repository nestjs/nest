import { NestModuleMetatype } from '@nestjs/common/interfaces/modules/module-metatype.interface';
export declare class ModuleTokenFactory {
    create(metatype: NestModuleMetatype, scope: NestModuleMetatype[]): string;
    getModuleName(metatype: NestModuleMetatype): string;
    getScopeStack(scope: NestModuleMetatype[]): string[];
    private reflectScope(metatype);
}
