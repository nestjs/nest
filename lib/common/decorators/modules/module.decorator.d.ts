import 'reflect-metadata';
/**
 * Defines the module
 * - `modules` - @deprecated the set of the 'imported' modules
 * - `imports` - the set of the 'imported' modules
 * - `controllers` - the list of controllers (e.g. HTTP controllers)
 * - `components` - the list of components that belong to this module. They can be injected between themselves.
 * - `exports` - the set of components, which should be available for modules, which imports this module
 * @param obj {ModuleMetadata} Module metadata
 */
export declare function Module(obj: {
    modules?: any[];
    imports?: any[];
    controllers?: any[];
    components?: any[];
    exports?: any[];
}): ClassDecorator;
