import { ForwardReference } from '../interfaces/modules/forward-reference.interface.js';

/**
 * @publicApi
 */
export const forwardRef = (fn: () => any): ForwardReference => ({
  forwardRef: fn,
});
