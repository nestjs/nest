import { ForwardRef, TForwardRef } from './interfaces';

export const forwardRef = (forwardRef: TForwardRef): ForwardRef => ({
  forwardRef,
});
