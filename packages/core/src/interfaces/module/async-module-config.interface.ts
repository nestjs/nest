import { DepsProvider } from '../provider.interface';
import { ModuleImport } from './module-metadata.interface';

export interface AsyncModuleConfig<T> extends DepsProvider {
  useFactory: (...args: any[]) => T | Promise<T>;
  imports?: ModuleImport[];
}
