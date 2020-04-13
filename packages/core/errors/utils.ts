import { Type } from '@nestjs/common';
import {
  isSymbol,
  isString,
  isObject,
  isFunction,
} from '@nestjs/common/utils/shared.utils';

import { Module } from '../injector/module';

type ClassInstance = Function | Type<any> | { name: string };
type Instance = ClassInstance | string | symbol;

/**
 * Returns the name of the instance,
 * Tries to get the class name, otherwise the string value
 * (= injection token)
 *
 * @param dependency The dependency whichs name should get displayed
 */
export const getInstanceName = (instance: Instance | null): string =>
  // use class name
  (instance as ClassInstance)?.name?.toString() ||
  // use injection token (symbol)
  (isSymbol(instance) && instance.toString()) ||
  // use injection token (string)
  (isString(instance) && instance);

type InstanceTransformerFn = (instance: string) => string;
/**
 * Returns the instance as displayed in the code.
 *
 * @param dependency The dependency which should get displayed as code
 */
export function createInstanceNameAsCodeFactory(
  asStringFn: InstanceTransformerFn,
  asSymbolFn: InstanceTransformerFn = i => i,
  asClassFn: InstanceTransformerFn = i => i,
) {
  return (instance: Instance | null) => {
    console.log(instance);
    return (
      ((instance as ClassInstance)?.name &&
        asClassFn((instance as ClassInstance).name)) ||
      (isSymbol(instance) && asSymbolFn(instance.toString())) ||
      (isString(instance) && asStringFn(instance))
    );
  };
}

/**
 * Returns the name of the module
 * Tries to get the class name. As fallback it returns 'current'.
 * @param module The module which should get displayed
 */
export const getModuleName = (module: Module): string =>
  module && getInstanceName(module.metatype);

export const getIndent = (amount: number, seperator = ' ') =>
  new Array(amount).join(seperator);
