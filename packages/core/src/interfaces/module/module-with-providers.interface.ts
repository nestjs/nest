import { Provider } from '../provider.interface';
import { Type } from '../type.interface';

export interface ModuleWithProviders {
  module: Type<any>;
  providers: Provider[];
}
