import { PARAMTYPES_METADATA } from '../../constants';

export function flatten<T extends Array<unknown> = any>(
  arr: T,
): T extends Array<infer R> ? R : never {
  const flat = ([] as any[]).concat(...arr);
  return flat.some(Array.isArray) ? flatten(flat) : flat;
}

/**
 * Decorator that sets required dependencies (required with a vanilla JavaScript objects)
 *
 * @publicApi
 */
export const Dependencies = (
  ...dependencies: Array<unknown>
): ClassDecorator => {
  const flattenDeps = flatten(dependencies);
  return (target: object) => {
    Reflect.defineMetadata(PARAMTYPES_METADATA, flattenDeps, target);
  };
};
