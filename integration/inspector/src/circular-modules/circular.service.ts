import { Injectable, forwardRef, Inject } from '@nestjs/common';
import { InputService } from './input.service.js';

@Injectable()
export class CircularService {
  constructor(
    @Inject(forwardRef(() => InputService))
    public readonly service: InputService,
  ) {}
}
