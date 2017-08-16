/**
 * Defines the Component. The component can inject dependencies through constructor.
 * Those dependencies should belongs to the same module.
 */
export const Component = (): ClassDecorator => {
    return (target: object) => {};
};

/**
 * Defines the Pipe. The Pipe should implements the `PipeTransform` interface.
 */
export const Pipe = (): ClassDecorator => {
    return (target: object) => {};
};

/**
 * Defines the Guard. The Guard should implements the `CanActivate` interface.
 */
export const Guard = (): ClassDecorator => {
    return (target: object) => {};
};

/**
 * Defines the Middleware. The Middleware should implements the `NestMiddleware` interface.
 */
export const Middleware = (): ClassDecorator => {
    return (target: object) => {};
};