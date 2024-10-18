// ClassDecorator, MethodDecorator, PropertyDecorator, ParameterDecorator defined here:
// https://github.com/microsoft/TypeScript/blob/main/src/lib/decorators.legacy.d.ts

/**
 * Function that returns a new decorator that applies all decorators provided by param
 *
 * Useful to build new decorators (or a decorator factory) encapsulating multiple decorators related with the same feature
 *
 * @param decorators one or more decorators (e.g., `ApplyGuard(...)`)
 *
 * @publicApi
 */
export function applyDecorators(
  ...decoratorsToCall: Array<ClassDecorator>
): ClassDecorator;
export function applyDecorators(
  ...decoratorsToCall: Array<MethodDecorator>
): MethodDecorator;
export function applyDecorators(
  ...decoratorsToCall: Array<PropertyDecorator>
): PropertyDecorator;
export function applyDecorators(
  ...decoratorsToCall: Array<ParameterDecorator>
): ParameterDecorator;
// applyDecorators<T> for cases when decorator has complex signature like `UseGuards(...): ClassDecorator & MethodDecorator`
export function applyDecorators<T>(...decoratorsToCall: Array<T>): T;
export function applyDecorators(
  ...decoratorsToCall: Array<
    ClassDecorator | MethodDecorator | PropertyDecorator | ParameterDecorator
  >
): ClassDecorator | MethodDecorator | PropertyDecorator | ParameterDecorator {
  return <TFunction extends Function, Y>(
    target: TFunction | Object,
    propertyKey?: string | symbol,
    descriptorOrParameterIndex?: number | TypedPropertyDescriptor<Y>,
  ) => {
    const whatIsBeingDecorated =
      target instanceof Function &&
      propertyKey === undefined &&
      descriptorOrParameterIndex === undefined
        ? 'Class'
        : target instanceof Object &&
            ['symbol', 'string'].includes(typeof propertyKey) &&
            descriptorOrParameterIndex === undefined
          ? 'Property'
          : target instanceof Object &&
              ['symbol', 'string'].includes(typeof propertyKey) &&
              descriptorOrParameterIndex instanceof Object
            ? 'Method'
            : target instanceof Object &&
                ['symbol', 'string', 'undefined'].includes(
                  typeof propertyKey,
                ) &&
                typeof descriptorOrParameterIndex === 'number'
              ? 'Parameter'
              : 'Unknown';

    const typedDecoratorsWithTheirTypedArgs = {
      Class: {
        decorators: decoratorsToCall as ClassDecorator[],
        args: [target] as [TFunction],
      },
      Property: {
        decorators: decoratorsToCall as PropertyDecorator[],
        args: [target, propertyKey] as [Object, string | symbol],
      },
      Method: {
        decorators: decoratorsToCall as MethodDecorator[],
        args: [target, propertyKey, descriptorOrParameterIndex] as [
          Object,
          string | symbol,
          TypedPropertyDescriptor<Y>,
        ],
      },
      Parameter: {
        decorators: decoratorsToCall as ParameterDecorator[],
        args: [target, propertyKey, descriptorOrParameterIndex] as [
          Object,
          string | symbol | undefined,
          number,
        ],
      },
    } as const;

    if (whatIsBeingDecorated === 'Class') {
      const { decorators, args } =
        typedDecoratorsWithTheirTypedArgs[whatIsBeingDecorated];

      let sequentiallyExtendedClass: TFunction | void = undefined;

      for (const decorator of decorators) {
        if (sequentiallyExtendedClass) {
          sequentiallyExtendedClass =
            decorator(sequentiallyExtendedClass) ?? sequentiallyExtendedClass;
        } else {
          sequentiallyExtendedClass = decorator(...args) ?? args[0];
        }
      }

      return sequentiallyExtendedClass;
    } else if (whatIsBeingDecorated === 'Method') {
      const { decorators, args } =
        typedDecoratorsWithTheirTypedArgs[whatIsBeingDecorated];
      let sequentiallyExtendedDescriptor: TypedPropertyDescriptor<Y> | void =
        undefined;

      for (const decorator of decorators) {
        if (sequentiallyExtendedDescriptor) {
          sequentiallyExtendedDescriptor =
            decorator(args[0], args[1], sequentiallyExtendedDescriptor) ??
            sequentiallyExtendedDescriptor;
        } else {
          sequentiallyExtendedDescriptor = decorator(...args) ?? args[2];
        }
      }

      return sequentiallyExtendedDescriptor;
    } else if (whatIsBeingDecorated === 'Parameter') {
      const { decorators, args } =
        typedDecoratorsWithTheirTypedArgs[whatIsBeingDecorated];
      for (const decorator of decorators) {
        decorator(...args);
      }
    } else if (whatIsBeingDecorated === 'Property') {
      const { decorators, args } =
        typedDecoratorsWithTheirTypedArgs[whatIsBeingDecorated];
      for (const decorator of decorators) {
        decorator(...args);
      }
    } else {
      throw new Error(
        'Decorator created by applyDecorators was called with invalid arguments. It can only be used on a class, method, property or parameter.',
      );
    }
  };
}
