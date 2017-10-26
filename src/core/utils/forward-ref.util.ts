import { isFunction } from './shared.utils';

export function forwardRef(fn: () => any) {
  return { forwardRef: fn };
}