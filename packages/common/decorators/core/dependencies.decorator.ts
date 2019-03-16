import { PARAMTYPES_METADATA } from '../../constants';

export function flatten<T extends any[] = any, R extends any[] = any>(
  arr: T,
): R {
  const flat = [].concat(...arr);
  return (flat.some(Array.isArray) ? flatten(flat) : flat) as R;
}

export const Dependencies = (...dependencies: any[]): ClassDecorator => {
  const flattenDeps = flatten(dependencies);
  return (target: object) => {
    Reflect.defineMetadata(PARAMTYPES_METADATA, flattenDeps, target);
  };
};
