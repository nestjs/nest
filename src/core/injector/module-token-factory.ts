import { NestModuleMetatype } from '@nestjs/common/interfaces/modules/module-metatype.interface';
import { SHARED_MODULE_METADATA } from '@nestjs/common/constants';
import { DynamicModule } from '@nestjs/common';

export class ModuleTokenFactory {
    public create(
      metatype: NestModuleMetatype,
      scope: NestModuleMetatype[],
      dynamicModuleMetadata: Partial<DynamicModule> | undefined = undefined,
    ) {
        const reflectedScope = this.reflectScope(metatype);
        const isSingleScoped = reflectedScope === true;
        const opaqueToken = {
            module: this.getModuleName(metatype),
            dynamic: this.getDynamicMetadataToken(dynamicModuleMetadata),
            scope: isSingleScoped ? this.getScopeStack(scope) : reflectedScope,
        };
        return JSON.stringify(opaqueToken);
    }

    public getDynamicMetadataToken(dynamicModuleMetadata: Partial<DynamicModule> | undefined): string {
      return dynamicModuleMetadata ? JSON.stringify(dynamicModuleMetadata) : '';
    }

    public getModuleName(metatype: NestModuleMetatype): string {
        return metatype.name;
    }

    public getScopeStack(scope: NestModuleMetatype[]): string[] {
        const reversedScope = scope.reverse();
        const firstGlobalIndex = reversedScope.findIndex((s) => this.reflectScope(s) === 'global');
        scope.reverse();

        const stack = firstGlobalIndex >= 0 ? scope.slice(scope.length - firstGlobalIndex - 1) : scope;
        return stack.map((module) => module.name);
    }

    private reflectScope(metatype: NestModuleMetatype) {
        const reflectedScope = Reflect.getMetadata(SHARED_MODULE_METADATA, metatype);
        return reflectedScope ? reflectedScope : 'global';
    }
}