import { ROUTE_CONFLICT_MESSAGE } from '../messages.js';
import { RuntimeException } from './runtime.exception.js';

export class RouteConflictException extends RuntimeException {
  constructor(messages: string[]) {
    super(ROUTE_CONFLICT_MESSAGE(messages));
  }
}
