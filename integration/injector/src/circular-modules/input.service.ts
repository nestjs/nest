import { Inject, Injectable, forwardRef } from '@nestjs/common';

// Use a lazy reference to avoid ESM circular-import TDZ issues
// with emitDecoratorMetadata. The class is imported asynchronously
// and cached for forwardRef resolution.
let CircularServiceRef: any;
void import('./circular.service.js').then(
  m => (CircularServiceRef = m.CircularService),
);

@Injectable()
export class InputService {
  constructor(
    @Inject(forwardRef(() => CircularServiceRef))
    public readonly service: any,
  ) {}
}
