import { ForwardReference } from '../interfaces/modules/forward-reference.interface';

export const forwardRef = (fn: () => any): ForwardReference => ({
  forwardRef: fn,
});
