import { readFileSync } from 'fs';
import { join } from 'path';

// `@nestjs/microservices` and `@nestjs/websockets` keep their own copy of
// getParamArgsMetadata(), so that they still load with an older
// `@nestjs/common`. A change here has to reach them too.
const packages = join(import.meta.dirname, '../../..');
const helper = (path: string) =>
  readFileSync(join(packages, path), 'utf8').match(
    /^export function getParamArgsMetadata\([\s\S]*?^}$/m,
  )?.[0];

describe('copies of getParamArgsMetadata() in the other packages', () => {
  const original = helper('common/utils/extend-metadata.util.ts');

  it.each(['microservices', 'websockets'])(
    'should be identical in %s',
    name => {
      expect(original).toBeDefined();
      expect(helper(`${name}/utils/get-param-args-metadata.util.ts`)).toBe(
        original,
      );
    },
  );
});
