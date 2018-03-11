import 'reflect-metadata';
export interface Constructor<T> {
  new (...args: any[]): T;
}
export declare const MergeWithValues: <T extends Constructor<{}>>(
  data: {
    [param: string]: any;
  },
) => (Metatype: T) => any;
