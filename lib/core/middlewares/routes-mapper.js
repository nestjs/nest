"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const router_explorer_1 = require("../router/router-explorer");
const unknown_request_mapping_exception_1 = require("../errors/exceptions/unknown-request-mapping.exception");
const shared_utils_1 = require("@nestjs/common/utils/shared.utils");
const constants_1 = require("@nestjs/common/constants");
const metadata_scanner_1 = require("../metadata-scanner");
class RoutesMapper {
    constructor(container) {
        this.routerExplorer = new router_explorer_1.RouterExplorer(new metadata_scanner_1.MetadataScanner(), container);
    }
    mapRouteToRouteProps(route) {
        if (shared_utils_1.isString(route)) {
            return [route];
        }
        const routePath = Reflect.getMetadata(constants_1.PATH_METADATA, route);
        if (shared_utils_1.isUndefined(routePath)) {
            return [this.mapObjectToPath(route)];
        }
        const paths = this.routerExplorer.scanForPaths(Object.create(route), route.prototype);
        const uniquePathsSet = new Set(paths.map(route => this.validateGlobalPath(routePath) +
            this.validateRoutePath(route.path)));
        return [...uniquePathsSet.values()];
    }
    mapObjectToPath(routeOrPath) {
        if (shared_utils_1.isString(routeOrPath)) {
            return this.validateRoutePath(routeOrPath);
        }
        const { path } = routeOrPath;
        if (shared_utils_1.isUndefined(path)) {
            throw new unknown_request_mapping_exception_1.UnknownRequestMappingException();
        }
        return this.validateRoutePath(path);
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
