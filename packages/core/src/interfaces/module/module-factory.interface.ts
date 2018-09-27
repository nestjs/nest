import { DynamicModule } from './dynamic-module.interface';

export interface ModuleFactory {
  target: any;
  token: string;
  dynamicMetadata?: Partial<DynamicModule>;
}
