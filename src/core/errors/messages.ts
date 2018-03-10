export const UnknownDependenciesMessage = (
  type: string,
  index: number,
  length: number,
) => {
  let message = `Nest can't resolve dependencies of the ${type}`;
  message += ` (`;

  const args = new Array(length).fill('+');
  args[index] = '?';
  message += args.join(', ');

  message += `). Please verify whether [${index}] argument is available in the current context.`;
  return message;
};

export const InvalidMiddlewareMessage = (name: string) =>
  `The middleware doesn't provide the 'resolve' method (${name})`;

export const InvalidModuleMessage = (scope: string) =>
  `Nest cannot create the module instance. The frequent reason of this exception is the circular dependency between modules. Use forwardRef() to avoid it (read more https://docs.nestjs.com/advanced/circular-dependency). Scope [${scope}]`;

export const UnknownExportMessage = (module: string) =>
  `Nest cannot export component / module that is not a part of the currently proccessed module (${module}). Please verify whether each exported unit is available in this particular context.`;

export const INVALID_MIDDLEWARE_CONFIGURATION = `Invalid middleware configuration passed inside the module 'configure()' method.`;
export const UNKNOWN_REQUEST_MAPPING = `Request mapping properties not defined in the @RequestMapping() annotation!`;
export const UNHANDLED_RUNTIME_EXCEPTION = `Unhandled Runtime Exception.`;
export const INVALID_EXCEPTION_FILTER = `Invalid exception filters (@UseFilters()).`;
export const MICROSERVICES_PACKAGE_NOT_FOUND_EXCEPTION = `Unable to load @nestjs/microservices packages (please, make sure whether it's installed already).`;
