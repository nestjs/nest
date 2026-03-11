export interface AppTrpcContext {
  requestId: string;
  apiKey?: string;
}

export const TRPC_PATH = '/trpc';
export const TRPC_REQUEST_ID_HEADER = 'x-request-id';
export const TRPC_API_KEY_HEADER = 'x-api-key';
export const DEMO_API_KEY = 'sample-secret';
