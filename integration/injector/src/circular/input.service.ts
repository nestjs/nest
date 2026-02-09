import { Inject, Injectable, forwardRef } from '@nestjs/common';

// Lazy reference to avoid ESM circular-import TDZ issues
// with emitDecoratorMetadata.
let CircularServiceRef: any;
import('./circular.service.js').then(
  m => (CircularServiceRef = m.CircularService),
);

@Injectable()
export class InputService {
  constructor(
    @Inject(forwardRef(() => CircularServiceRef))
    public readonly service: any,
  ) {}
}
