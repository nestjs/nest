import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
} from 'fs';
import { createRequire } from 'module';
import { tmpdir } from 'os';
import { join, resolve } from 'path';

const packagesDir = resolve(__dirname, '..', '..');
const packageNames = readdirSync(packagesDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name);

describe('package.json "exports" map', () => {
  let sandboxDir: string;
  let sandboxRequire: NodeJS.Require;

  beforeAll(() => {
    sandboxDir = realpathSync(mkdtempSync(join(tmpdir(), 'nest-exports-')));
    for (const name of packageNames) {
      const target = join(sandboxDir, 'node_modules', '@nestjs', name);
      mkdirSync(target, { recursive: true });
      copyFileSync(
        join(packagesDir, name, 'package.json'),
        join(target, 'package.json'),
      );
    }
    sandboxRequire = createRequire(join(sandboxDir, 'index.js'));
  });

  afterAll(() => {
    rmSync(sandboxDir, { recursive: true, force: true });
  });

  it('should cover every published package', () => {
    expect(packageNames).toEqual(
      expect.arrayContaining(['common', 'core', 'testing']),
    );
  });

  it.each(packageNames)(
    'should allow resolving "@nestjs/%s/package.json"',
    name => {
      const pkgPath = `@nestjs/${name}/package.json`;
      expect(sandboxRequire.resolve(pkgPath)).toBe(
        join(sandboxDir, 'node_modules', '@nestjs', name, 'package.json'),
      );
      expect(sandboxRequire(pkgPath).name).toBe(`@nestjs/${name}`);
    },
  );
});
