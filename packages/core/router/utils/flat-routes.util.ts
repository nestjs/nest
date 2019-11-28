import { Routes } from '../interfaces/routes.interface';
import { validatePath } from '@nestjs/common/utils/shared.utils';

export function flatRoutes(routes: Routes, result = []) {
  routes.forEach(element => {
    if (element.module && element.path) {
      result.push(element);
    }
    if (element.children) {
      const childrenRef = element.children as Routes;
      childrenRef.forEach(child => {
        if (!(typeof child === 'string') && child.path) {
          child.path = validatePath(
            validatePath(element.path) + validatePath(child.path),
          );
        } else {
          result.push({ path: element.path, module: child });
        }
      });
      return flatRoutes(childrenRef, result);
    }
  });
  result.forEach(route => {
    // clean up
    delete route.children;
  });
  return result;
}
