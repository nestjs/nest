import { readFileSync } from 'fs';
import { join } from 'path';
import { DEFAULT_MAX_CONCURRENT_MESSAGES } from '../../constants.js';

// `@nestjs/platform-ws` and `@nestjs/platform-socket.io` keep their own copy
// of mergeMapBounded() and of the default limit, so that they still load with
// an older `@nestjs/websockets`. A change here has to reach them too.
const packages = join(import.meta.dirname, '../../..');
const read = (path: string) => readFileSync(join(packages, path), 'utf8');
const adapters = [
  'platform-ws/adapters/ws-adapter.ts',
  'platform-socket.io/adapters/io-adapter.ts',
];

describe('copies of mergeMapBounded() in the platform packages', () => {
  const original = read('websockets/utils/merge-map-bounded.util.ts');

  it.each(['platform-ws', 'platform-socket.io'])(
    'should be identical in %s',
    name => {
      expect(read(`${name}/utils/merge-map-bounded.util.ts`)).toBe(original);
    },
  );

  it.each(adapters)(
    'should use the default limit of @nestjs/websockets in %s',
    path => {
      const match = read(path).match(
        /const DEFAULT_MAX_CONCURRENT_MESSAGES = (\d+);/,
      );
      expect(Number(match?.[1])).toBe(DEFAULT_MAX_CONCURRENT_MESSAGES);
    },
  );
});
