"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const router_explorer_1 = require("../router/router-explorer");
const unknown_request_mapping_exception_1 = require("../errors/exceptions/unknown-request-mapping.exception");
const request_method_enum_1 = require("@nestjs/common/enums/request-method.enum");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const constants_1 = require("@nestjs/common/constants");
const metadata_scanner_1 = require("../metadata-scanner");
class RoutesMapper {
    constructor() {
        this.routerExplorer = new router_explorer_1.ExpressRouterExplorer(new metadata_scanner_1.MetadataScanner());
    }
    mapRouteToRouteProps(routeMetatype) {
        const routePath = Reflect.getMetadata(constants_1.PATH_METADATA, routeMetatype);
        if (shared_utils_1.isUndefined(routePath)) {
            return [this.mapObjectToRouteProps(routeMetatype)];
        }
        const paths = this.routerExplorer.scanForPaths(Object.create(routeMetatype), routeMetatype.prototype);
        return paths.map(route => ({
            path: this.validateGlobalPath(routePath) + this.validateRoutePath(route.path),
            method: route.requestMethod,
        }));
    }
    mapObjectToRouteProps(route) {
        const { path, method } = route;
        if (shared_utils_1.isUndefined(path)) {
            throw new unknown_request_mapping_exception_1.UnknownRequestMappingException();
        }
        return {
            path: this.validateRoutePath(path),
            method: shared_utils_1.isUndefined(method) ? request_method_enum_1.RequestMethod.ALL : method,
        };
    }
    validateGlobalPath(path) {
        const prefix = shared_utils_1.validatePath(path);
        return prefix === '/' ? '' : prefix;
    }
    validateRoutePath(path) {
        return shared_utils_1.validatePath(path);
    }
}
exports.RoutesMapper = RoutesMapper;
