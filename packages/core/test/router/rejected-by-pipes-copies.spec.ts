import { readFileSync } from 'fs';
import { join } from 'path';

// The upload interceptors of `@nestjs/platform-express` and
// `@nestjs/platform-fastify` read the marker under its registered symbol
// rather than importing isRejectedByPipes(), so that they still load with an
// older `@nestjs/core`. Its key has to stay the same in all of them.
const packages = join(import.meta.dirname, '../../..');
const symbolKey = (path: string) =>
  readFileSync(join(packages, path), 'utf8').match(
    /const REJECTED_BY_PIPES = Symbol\.for\('([^']+)'\);/,
  )?.[1];

describe('readers of the rejected-by-pipes marker in the platform packages', () => {
  const key = symbolKey('core/router/rejected-by-pipes.ts');

  it.each([
    'platform-express/multer/multer/multer.utils.ts',
    'platform-fastify/multipart/multipart/multipart-interceptor.factory.ts',
  ])('should use the same symbol in %s', path => {
    expect(key).toBeDefined();
    expect(symbolKey(path)).toBe(key);
  });
});
