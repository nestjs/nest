import {SHARED_MODULE_METADATA} from '@nestjs/common/constants';
import {
  NestModuleMetatype
} from '@nestjs/common/interfaces/modules/module-metatype.interface';

export class ModuleTokenFactory {
  public create(metatype: NestModuleMetatype, scope: NestModuleMetatype[]) {
    const reflectedScope = this.reflectScope(metatype);
    const isSingleScoped = reflectedScope === true;
    const opaqueToken = {
      module : this.getModuleName(metatype),
      scope : isSingleScoped ? this.getScopeStack(scope) : reflectedScope,
    };
    return JSON.stringify(opaqueToken);
  }

  public getModuleName(metatype: NestModuleMetatype): string {
    return metatype.name;
  }

  public getScopeStack(scope: NestModuleMetatype[]): string[] {
    const reversedScope = scope.reverse();
    const firstGlobalIndex =
        reversedScope.findIndex((s) => this.reflectScope(s) === 'global');
    scope.reverse();

    const stack = firstGlobalIndex >= 0
                      ? scope.slice(scope.length - firstGlobalIndex - 1)
                      : scope;
    return stack.map((module) => module.name);
  }

  private reflectScope(metatype: NestModuleMetatype) {
    const reflectedScope =
        Reflect.getMetadata(SHARED_MODULE_METADATA, metatype);
    return reflectedScope ? reflectedScope : 'global';
  }
}