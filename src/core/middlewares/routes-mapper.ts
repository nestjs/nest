import 'reflect-metadata';
import { ExpressRouterExplorer } from '../router/router-explorer';
import { UnknownRequestMappingException } from '../../errors/exceptions/unknown-request-mapping.exception';
import { RequestMethod } from '../../common/enums/request-method.enum';
import { isUndefined, validatePath } from '../../common/utils/shared.utils';
import { PATH_METADATA } from '../../common/constants';
import { MetadataScanner } from '../metadata-scanner';

export class RoutesMapper {
    private readonly routerExplorer = new ExpressRouterExplorer(new MetadataScanner());

    public mapRouteToRouteProps(routeMetatype) {
        const routePath: string = Reflect.getMetadata(PATH_METADATA, routeMetatype);
        if (isUndefined(routePath)) {
            return [this.mapObjectToRouteProps(routeMetatype)];
        }
        const paths = this.routerExplorer.scanForPaths(Object.create(routeMetatype), routeMetatype.prototype);
        return paths.map((route) => ({
            path: this.validateRoutePath(routePath) + this.validateRoutePath(route.path),
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

    private validateRoutePath(path: string): string {
        return validatePath(path);
    }
}
