import { forwardRef, Inject, Injectable } from '@nestjs/common';

// Use a lazy reference to avoid ESM circular-import TDZ issues
// with emitDecoratorMetadata.
let InputServiceRef: any;
import('./input.service.js').then(m => (InputServiceRef = m.InputService));

@Injectable()
export class CircularService {
  constructor(
    @Inject(forwardRef(() => InputServiceRef))
    public readonly service: any,
  ) {}
}
