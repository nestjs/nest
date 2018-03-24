import 'reflect-metadata';
import { ModuleMetadata } from '../../interfaces/modules/module-metadata.interface';
/**
 * Defines the module
 * - `imports` - the set of the 'imported' modules
 * - `controllers` - the list of controllers (e.g. HTTP controllers)
 * - `providers` - the list of providers that belong to this module. They can be injected between themselves.
 * - `exports` - the set of components, which should be available for modules, which imports this module
 * - `modules` - @deprecated the set of the 'imported' modules
 * - `components` - @deprecated the list of components that belong to this module. They can be injected between themselves.
 * @param obj {ModuleMetadata} Module metadata
 */
export declare function Module(obj: ModuleMetadata): ClassDecorator;
