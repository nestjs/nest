import { ROUTE_ARGS_METADATA } from '../../constants.js';
import {
  SSE_ABORT_CONTROLLER,
  SseSignal,
} from '../../decorators/http/sse-signal.decorator.js';

describe('@SseSignal', () => {
  class Test {
    public stream(@SseSignal() signal) {}
  }

  const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'stream');
  const { factory } = metadata[Object.keys(metadata)[0]];
  const createContext = (request: unknown) =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
    }) as any;

  it('should return the signal of the abort controller attached to the request', () => {
    const controller = new AbortController();
    const request = { [SSE_ABORT_CONTROLLER]: controller };

    expect(factory(undefined, createContext(request))).toBe(controller.signal);
  });

  it('should return undefined when no abort controller is attached to the request', () => {
    expect(factory(undefined, createContext({}))).toBeUndefined();
  });

  it('should return undefined when there is no request', () => {
    expect(factory(undefined, createContext(undefined))).toBeUndefined();
  });
});
