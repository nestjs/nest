import 'reflect-metadata';
import { PARAMTYPES_METADATA } from '../../constants';

export function flatten(arr) {
  const flat = [].concat(...arr);
  return flat.some(Array.isArray) ? flatten(flat) : flat;
};

export const Dependencies = (...dependencies): ClassDecorator => {
  const flattenDeps = flatten(dependencies);
  return (target: object) => {
    Reflect.defineMetadata(PARAMTYPES_METADATA, flattenDeps, target);
  };
};
