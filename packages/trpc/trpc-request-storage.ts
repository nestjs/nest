import { AsyncLocalStorage } from 'async_hooks';

interface TrpcRequestStore {
  req: any;
  res: any;
  contextId?: { id: number; payload?: unknown };
  requestRegistered?: boolean;
}

export const trpcRequestStorage = new AsyncLocalStorage<TrpcRequestStore>();
