import 'reflect-metadata';
export declare class RoutesMapper {
    private readonly routerExplorer;
    mapRouteToRouteProps(routeMetatype: any): {
        path: string;
        method: any;
    }[];
    private mapObjectToRouteProps(route);
    private validateGlobalPath(path);
    private validateRoutePath(path);
}
