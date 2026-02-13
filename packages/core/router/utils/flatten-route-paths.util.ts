import { Type } from '@nestjs/common';
import { isString, normalizePath } from '@nestjs/common/utils/shared.utils';
import { Routes } from '../interfaces/routes.interface';

export function flattenRoutePaths(routes: Routes) {
  const result: Array<{
    module: Type;
    path: string | string[];
  }> = [];
  routes.forEach(item => {
    if (item.module && item.path) {
      result.push({ module: item.module, path: item.path });
    }
    if (item.children) {
      const childrenRef = item.children as Routes;
      childrenRef.forEach(child => {
        if (
          !isString(child) &&
          (isString(child.path) || Array.isArray(child.path))
        ) {
          const normalizedChildPaths: string[] = [];
          const parentPaths = Array.isArray(item.path)
            ? item.path
            : [item.path];
          for (const parentPath of parentPaths) {
            const childPaths = Array.isArray(child.path)
              ? child.path
              : [child.path];
            for (const childPath of childPaths) {
              normalizedChildPaths.push(
                normalizePath(
                  normalizePath(parentPath) + normalizePath(childPath),
                ),
              );
            }
          }
          child.path =
            normalizedChildPaths.length === 1
              ? normalizedChildPaths[0]
              : normalizedChildPaths;
        } else {
          result.push({ path: item.path, module: child as any as Type });
        }
      });
      result.push(...flattenRoutePaths(childrenRef));
    }
  });
  return result;
}
