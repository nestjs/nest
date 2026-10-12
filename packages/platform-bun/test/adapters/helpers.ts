import type { NestApplicationOptions, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  BunAdapter,
  type BunAdapterOptions,
  type NestBunApplication,
} from '../../index.js';

/**
 * Whether the suite runs on the Bun runtime. On Node.js (the default `npm run
 * test`), requests go through `adapter.fetch()` in-process; on Bun they go
 * over a real `Bun.serve()` socket.
 */
export const isBun = typeof (globalThis as any).Bun !== 'undefined';

export const sleep = (ms: number) =>
  new Promise<void>(resolve => setTimeout(resolve, ms));

export interface TestApp {
  app: NestBunApplication;
  adapter: BunAdapter;
  /** Base URL of the listening server (Bun only, empty in-process). */
  url: string;
  fetch: (path: string, init?: RequestInit) => Promise<Response>;
  json: <T = any>(
    path: string,
    init?: RequestInit,
  ) => Promise<{ status: number; body: T; headers: Headers }>;
  close: () => Promise<void>;
}

export async function bootstrap(
  module: Type<unknown>,
  opts: {
    adapter?: BunAdapterOptions;
    app?: NestApplicationOptions;
    configure?: (app: NestBunApplication, adapter: BunAdapter) => unknown;
    /** Force in-process dispatch even on Bun. */
    inProcess?: boolean;
  } = {},
): Promise<TestApp> {
  const adapter = new BunAdapter(opts.adapter);
  const app = await NestFactory.create<NestBunApplication>(module, adapter, {
    logger: false,
    ...opts.app,
  });
  await opts.configure?.(app, adapter);

  let url = '';
  let doFetch: TestApp['fetch'];
  if (isBun && !opts.inProcess) {
    await app.listen(0);
    url = await app.getUrl();
    doFetch = (path, init) => fetch(url + path, init);
  } else {
    await app.init();
    doFetch = (path, init) =>
      adapter.fetch(new Request(`http://localhost${path}`, init));
  }

  return {
    app,
    adapter,
    url,
    fetch: doFetch,
    json: async (path, init) => {
      const res = await doFetch(path, init);
      const text = await res.text();
      let body: any = text;
      try {
        body = text ? JSON.parse(text) : undefined;
      } catch {
        /* keep text */
      }
      return { status: res.status, body, headers: res.headers };
    },
    close: () => app.close(),
  };
}

export const jsonInit = (
  method: string,
  body: unknown,
  headers: Record<string, string> = {},
): RequestInit => ({
  method,
  headers: { 'content-type': 'application/json', ...headers },
  body: JSON.stringify(body),
});
