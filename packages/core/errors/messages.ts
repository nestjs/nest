import { Type } from '@nestjs/common';
import { isNil } from '@nestjs/common/utils/shared.utils';
import {
  InjectorDependency,
  InjectorDependencyContext,
} from '../injector/injector';
import { Module } from '../injector/module';

// TODO: Replace `any` with `unknown` type when TS 3.0.0 is supported
/**
 * Returns the name of an instance
 * @param instance The instance which should get the name from
 */
const getInstanceName = (instance: any) =>
  instance && (instance as Type<any>).name;

/**
 * Returns the name of the dependency
 * Tries to get the class name, otherwise the string value
 * (= injection token). As fallback it returns '+'
 * @param dependency The dependency whichs name should get displayed
 */
const getDependencyName = (dependency: InjectorDependency) =>
  getInstanceName(dependency) || dependency || '+';
/**
 * Returns the name of the module
 * Tries to get the class name. As fallback it returns 'current'.
 * @param module The module which should get displayed
 */
const getModuleName = (module: Module) =>
  (module && getInstanceName(module.metatype)) || 'current';

export const UNKNOWN_DEPENDENCIES_MESSAGE = (
  type: string,
  unknownDependencyContext: InjectorDependencyContext,
  module: Module,
) => {
  const { index, dependencies, key } = unknownDependencyContext;
  let message = `Nest can't resolve dependencies of the ${type}`;

  if (isNil(index)) {
    message += `. Please make sure that the "${key}" property is available in the current context.`;
    return message;
  }
  const dependenciesName = (dependencies || []).map(getDependencyName);
  dependenciesName[index] = '?';

  message += ` (`;
  message += dependenciesName.join(', ');
  message += `). Please make sure that the argument at index [${index}] is available in the ${getModuleName(
    module,
  )} context.`;
  return message;
};

export const INVALID_MIDDLEWARE_MESSAGE = (
  text: TemplateStringsArray,
  name: string,
) => `The middleware doesn't provide the 'resolve' method (${name})`;

export const INVALID_MODULE_MESSAGE = (
  text: TemplateStringsArray,
  scope: string,
) =>
  `Nest cannot create the module instance. Often, this is because of a circular dependency between modules. Use forwardRef() to avoid it. (Read more https://docs.nestjs.com/advanced/circular-dependency.) Scope [${scope}]`;

export const UNKNOWN_EXPORT_MESSAGE = (
  text: TemplateStringsArray,
  module: string,
) =>
  `Nest cannot export a provider/module that is not a part of the currently processed module (${module}). Please verify whether each exported unit is available in this particular context.`;

export const INVALID_CLASS_MESSAGE = (text: TemplateStringsArray, value: any) =>
  `ModuleRef cannot instantiate class (${value} is not constructable).`;

export const INVALID_MIDDLEWARE_CONFIGURATION = `Invalid middleware configuration passed inside the module 'configure()' method.`;
export const UNKNOWN_REQUEST_MAPPING = `Request mapping properties not defined in the @RequestMapping() annotation!`;
export const UNHANDLED_RUNTIME_EXCEPTION = `Unhandled Runtime Exception.`;
export const INVALID_EXCEPTION_FILTER = `Invalid exception filters (@UseFilters()).`;
export const MICROSERVICES_PACKAGE_NOT_FOUND_EXCEPTION = `Unable to load @nestjs/microservices package. (Please make sure that it's already installed.)`;
