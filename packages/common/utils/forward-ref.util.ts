import { ForwardReference } from '../interfaces/modules/forward-reference.interface';

/**
 * @publicApi
 */
export const forwardRef = (fn: () => any): ForwardReference => ({
  forwardRef: fn,
});
