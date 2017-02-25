import 'reflect-metadata';
import { RouterBuilder } from '../router/router-builder';
import { UnkownRequestMappingException } from '../../errors/exceptions/unkown-request-mapping.exception';
import { RequestMethod } from '../../common/enums/request-method.enum';
import { isUndefined, validatePath } from '../../common/utils/shared.utils';
import { PATH_METADATA } from '../../common/constants';

export class RoutesMapper {
    private readonly routerBuilder = new RouterBuilder();

    mapRouteToRouteProps(routeMetatype) {
        const routePath: string = Reflect.getMetadata(PATH_METADATA, routeMetatype);
        if (isUndefined(routePath)) {
            return [ this.mapObjectToRouteProps(routeMetatype) ];
        }

        const paths = this.routerBuilder.scanForPathsFromPrototype(
            Object.create(routeMetatype),
            routeMetatype.prototype
        );

        return paths.map((singlePath) => ({
            path: this.validateRoutePath(routePath) + this.validateRoutePath(singlePath.path),
            method: singlePath.requestMethod
        }));
    }

    private mapObjectToRouteProps(route) {
        const { path, method } = route;
        if (isUndefined(path)) {
            throw new UnkownRequestMappingException();
        }

        return {
            path: this.validateRoutePath(path),
            method: (isUndefined(method)) ? RequestMethod.ALL : method
        };
    }

    private validateRoutePath(path: string): string {
        return validatePath(path);
    }

}
