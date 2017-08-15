/**
 * Defines the Component. The component can inject dependencies through constructor.
 * Those dependencies should belongs to the same module.
 */
export const Component = (): ClassDecorator => {
    return (target: object) => {};
};