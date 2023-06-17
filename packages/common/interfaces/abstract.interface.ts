/**
 * Same as `Type` utility type but for abstract classes.
 */
export interface Abstract<T = any> extends Function {
  prototype: T;
}
