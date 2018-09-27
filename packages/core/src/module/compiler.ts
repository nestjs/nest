import { ModuleTokenFactory } from './module-token-factory';
import { Registry } from '../registry';
import { NestModule } from './module';
import { Utils } from '../util';
import {
  ModuleImport,
  DynamicModule,
  Type,
  ModuleFactory,
} from '../interfaces';

export class ModuleCompiler {
  private readonly moduleTokenFactory = new ModuleTokenFactory();

  public async compile(
    module: Partial<ModuleImport>,
    scope: Type<NestModule>[],
  ): Promise<ModuleFactory> {
    const { target, dynamicMetadata } = await this.extractMetadata(module);
    const token = this.moduleTokenFactory.create(
      target,
      scope,
      dynamicMetadata,
    );
    return { target, dynamicMetadata, token };
  }

  private async extractMetadata(
    module: Partial<ModuleImport>,
  ): Promise<Partial<ModuleFactory>> {
    const moduleRef = await Utils.getDeferred<Type<NestModule> | DynamicModule>(
      module,
    );

    if (!Registry.isDynamicModule(moduleRef)) {
      return { target: <Type<NestModule>>module };
    }

    const { module: target, ...dynamicMetadata } = <DynamicModule>moduleRef;
    return { target, dynamicMetadata };
  }
}
