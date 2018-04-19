import { NestContainer } from './container';
export declare class InstanceLoader {
    private readonly container;
    private readonly injector;
    private readonly logger;
    constructor(container: NestContainer);
    createInstancesOfDependencies(): Promise<void>;
    private createPrototypes(modules);
    private createInstances(modules);
    private createPrototypesOfComponents(module);
    private createInstancesOfComponents(module);
    private createPrototypesOfRoutes(module);
    private createInstancesOfRoutes(module);
    private createPrototypesOfInjectables(module);
    private createInstancesOfInjectables(module);
}
