import { normalizePath, isString } from '@nestjs/common/utils/shared.utils';
import { Routes } from '../interfaces/routes.interface';

export function flattenRoutePaths(
  routes: Routes,
  parentPathBeforeVersion?: boolean,
) {
  const result = [];
  routes.forEach(item => {
    const pathBeforeVersion = item.pathBeforeVersion ?? parentPathBeforeVersion;
    if (item.module && item.path) {
      result.push({
        module: item.module,
        path: item.path,
        pathBeforeVersion,
      });
    }
    if (item.children) {
      const childrenRef = item.children as Routes;
      childrenRef.forEach(child => {
        if (!isString(child) && child.path) {
          child.path = normalizePath(
            normalizePath(item.path) + normalizePath(child.path),
          );
        } else {
          result.push({
            path: item.path,
            pathBeforeVersion,
            module: child,
          });
        }
      });
      result.push(...flattenRoutePaths(childrenRef, pathBeforeVersion));
    }
  });
  return result;
}
