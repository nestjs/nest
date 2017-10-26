import 'reflect-metadata';
import { PATH_METADATA } from '../constants';
import { RequestMethod } from '../enums/request-method.enum';
import { UnknownRequestMappingException } from '../errors/exceptions/unknown-request-mapping.exception';
import { MetadataScanner } from '../metadata-scanner';
import { ExpressRouterExplorer } from '../router/router-explorer';
import { isUndefined, validatePath } from '../utils/shared.utils';

export class RoutesMapper {
    private readonly routerExplorer = new ExpressRouterExplorer(new MetadataScanner());

    public mapRouteToRouteProps(routeMetatype) {
        const routePath: string = Reflect.getMetadata(PATH_METADATA, routeMetatype);
        if (isUndefined(routePath)) {
            return [this.mapObjectToRouteProps(routeMetatype)];
        }
        const paths = this.routerExplorer.scanForPaths(Object.create(routeMetatype), routeMetatype.prototype);
        return paths.map((route) => ({
            path: this.validateGlobalPath(routePath) + this.validateRoutePath(route.path),
            method: route.requestMethod,
        }));
    }

    private mapObjectToRouteProps(route) {
        const { path, method } = route;
        if (isUndefined(path)) {
            throw new UnknownRequestMappingException();
        }
        return {
            path: this.validateRoutePath(path),
            method: isUndefined(method) ? RequestMethod.ALL : method,
        };
    }

    private validateGlobalPath(path: string): string {
        const prefix = validatePath(path);
        return prefix === '/' ? '' : prefix;
    }

    private validateRoutePath(path: string): string {
        return validatePath(path);
    }
}
