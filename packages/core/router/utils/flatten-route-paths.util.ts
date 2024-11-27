import { Type } from '@nestjs/common';
import { isString, normalizePath } from '@nestjs/common/utils/shared.utils';
import { Routes } from '../interfaces/routes.interface';

export function flattenRoutePaths(routes: Routes) {
  const result: Array<{
    module: Type;
    path: string;
  }> = [];
  routes.forEach(item => {
    if (item.module && item.path) {
      result.push({ module: item.module, path: item.path });
    }
    if (item.children) {
      const childrenRef = item.children as Routes;
      childrenRef.forEach(child => {
        if (!isString(child) && child.path) {
          child.path = normalizePath(
            normalizePath(item.path) + normalizePath(child.path),
          );
        } else {
          result.push({ path: item.path, module: child as any as Type });
        }
      });
      result.push(...flattenRoutePaths(childrenRef));
    }
  });
  return result;
}
