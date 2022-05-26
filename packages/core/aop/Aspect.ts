import { applyDecorators, Injectable } from '@nestjs/common';

export const ASPECT = Symbol('ASPECT_CLASS');

/**
 * Decorator for locating the LazyDecorator implementation in the Provider list.
 *
 * @constructor
 */
export function Aspect() {
  return applyDecorators((target: any) => {
    Reflect.defineMetadata(ASPECT, 'ASPECT_CLASS', target);
  }, Injectable);
}
