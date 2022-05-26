import { applyDecorators, Injectable } from '@nestjs/common';

export const ASPECT = Symbol('ASPECT_CLASS');

export function Aspect() {
  return applyDecorators((target: any) => {
    Reflect.defineMetadata(ASPECT, 'ASPECT_CLASS', target);
  }, Injectable);
}
