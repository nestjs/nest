import 'reflect-metadata';
import { PARAMTYPES_METADATA } from '../../constants';

const flatten = (arr) => {
  const flat = [].concat(...arr);
  return flat.some(Array.isArray) ? flatten(flat) : flat;
};

export const Dependencies = (...metadata): ClassDecorator => {
    const flattenDeps = flatten(metadata);
    return (target: object) => {
        Reflect.defineMetadata(PARAMTYPES_METADATA, flattenDeps, target);
    };
};
