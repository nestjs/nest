import { Constructor } from './constructor.interface';

export interface TargetRef {
  target: Function | Constructor;
}

export interface TargetPropertyRef extends TargetRef {
  propertyKey: string | symbol;
}
