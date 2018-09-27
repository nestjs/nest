import { Type } from './type.interface';
import { Provider } from './provider.interface';
import { InjectionToken } from '../module';

export type TForwardRef = () => Type<Provider> | InjectionToken<any>;

export interface ForwardRef {
  forwardRef: TForwardRef;
}
