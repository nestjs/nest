import { readFileSync } from 'fs';
import { join } from 'path';
import { WS_PATH_PARAMS } from '../constants.js';

// `@nestjs/platform-ws` stores the path params under the registered symbol
// rather than importing WS_PATH_PARAMS, so that it still loads with an older
// `@nestjs/websockets`. Its key has to stay the same in both packages.
const packages = join(import.meta.dirname, '../..');
const symbolKey = (path: string) =>
  readFileSync(join(packages, path), 'utf8').match(
    /const WS_PATH_PARAMS = Symbol\.for\('([^']+)'\);/,
  )?.[1];

describe('the WS_PATH_PARAMS key in @nestjs/platform-ws', () => {
  it('should be the registered symbol of @nestjs/websockets', () => {
    const key = Symbol.keyFor(WS_PATH_PARAMS);

    expect(key).toBeDefined();
    expect(symbolKey('platform-ws/adapters/ws-adapter.ts')).toBe(key);
  });
});
