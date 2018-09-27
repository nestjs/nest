import { MiddlewareConfigure } from '@nest/server';

// @TODO: Rename interface?
// Seems inconvenient to call it that when it can configure routes as well
export class CatsConfigure implements MiddlewareConfigure {
  configure() {}
}
