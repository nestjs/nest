import 'reflect-metadata';
import { NestContainer } from '../injector/container';
export declare class RoutesMapper {
    private readonly routerExplorer;
    constructor(container: NestContainer);
    mapRouteToRouteProps(routeMetatype: any): string[];
    private mapObjectToPath(routeOrPath);
    private validateGlobalPath(path);
    private validateRoutePath(path);
}
