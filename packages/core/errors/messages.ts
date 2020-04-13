import { isNil } from '@nestjs/common/utils/shared.utils';

import { InjectorDependencyContext } from '../injector/injector';
import { Module } from '../injector/module';
import { InstanceWrapper } from '../injector/instance-wrapper';
import {
  getClassCodeExcerpt,
  getUseFactoryCodeExcerpt,
  getPropertyCodeExcerpt,
} from './code-excerpt';
import { getInstanceName, getModuleName } from './utils';

export function UNKNOWN_DEPENDENCIES_MESSAGE(
  instanceWrapper: InstanceWrapper,
  dependencyContext: InjectorDependencyContext,
  module?: Module,
) {
  const { index, name = 'dependency', dependencies, key } = dependencyContext;

  const instanceName = getInstanceName(instanceWrapper);
  const moduleName = getModuleName(module);
  const dependencyName = getInstanceName(name);

  let message = `Nest can't resolve dependencies of the ${instanceName}.\n\n`;

  if (isNil(index)) {
    // Is injected via property
    message += getPropertyCodeExcerpt(instanceWrapper, dependencyContext);
    message += `\n\nPlease make sure that the "${key.toString()}" property is available in the current context.`;
  } else {
    if (instanceWrapper.metatype.name === 'useFactory') {
      message += getUseFactoryCodeExcerpt(instanceWrapper, dependencyContext);
    } else {
      message += getClassCodeExcerpt(instanceWrapper, dependencyContext);
    }

    message += `\n\nPlease make sure that the argument ${dependencyName} at index [${index}] is available in the ${moduleName} context.`;
  }

  message += `\n
Potential solutions:
- If ${dependencyName} is a provider, is it part of the current ${moduleName}?
- If ${dependencyName} is exported from a separate @Module, is that module imported within ${moduleName}?
  @Module({
    imports: [ /* the Module containing ${dependencyName} */ ]
  })
  `;

  return message;
}

export const INVALID_MIDDLEWARE_MESSAGE = (
  text: TemplateStringsArray,
  name: string,
) => `The middleware doesn't provide the 'use' method (${name})`;

export const INVALID_MODULE_MESSAGE = (
  text: TemplateStringsArray,
  scope: string,
) =>
  `Nest cannot create the module instance. Often, this is because of a circular dependency between modules. Use forwardRef() to avoid it.

(Read more: https://docs.nestjs.com/fundamentals/circular-dependency)
Scope [${scope}]
`;

export const UNKNOWN_EXPORT_MESSAGE = (token = 'item', module: string) => {
  return `Nest cannot export a provider/module that is not a part of the currently processed module (${module}). Please verify whether the exported ${token} is available in this particular context.

Possible Solutions:
- Is ${token} part of the relevant providers/imports within ${module}?
`;
};

export const INVALID_CLASS_MESSAGE = (text: TemplateStringsArray, value: any) =>
  `ModuleRef cannot instantiate class (${value} is not constructable).`;

export const INVALID_CLASS_SCOPE_MESSAGE = (
  text: TemplateStringsArray,
  name: string | undefined,
) =>
  `${
    name || 'This class'
  } is marked as a scoped provider. Request and transient-scoped providers can't be used in combination with "get()" method. Please, use "resolve()" instead.`;

export const INVALID_MIDDLEWARE_CONFIGURATION = `An invalid middleware configuration has been passed inside the module 'configure()' method.`;
export const UNKNOWN_REQUEST_MAPPING = `An invalid controller has been detected. Perhaps, one of your controllers is missing @Controller() decorator.`;
export const UNHANDLED_RUNTIME_EXCEPTION = `Unhandled Runtime Exception.`;
export const INVALID_EXCEPTION_FILTER = `Invalid exception filters (@UseFilters()).`;
export const MICROSERVICES_PACKAGE_NOT_FOUND_EXCEPTION = `Unable to load @nestjs/microservices package. (Please make sure that it's already installed.)`;
