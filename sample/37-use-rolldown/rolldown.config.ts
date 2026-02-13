import { defineConfig } from 'rolldown';
import run from '@rollup/plugin-run';

// Check if watch mode is enabled
const isWatchMode =
  process.env.ROLLUP_WATCH ||
  process.argv.includes('-w') ||
  process.argv.includes('--watch');

export default defineConfig({
  platform: 'node',
  input: 'src/main.ts',
  output: {
    cleanDir: true,
    dir: './dist',
    format: 'module',
    preserveModules: true,
    sourcemap: true,
  },
  external: [
    '@nestjs/common',
    '@nestjs/core',
    '@nestjs/platform-express',
    'class-transformer',
    'class-validator',
    /^rxjs/,
  ],
  plugins: [
    // Run only in watch mode
    // @ts-expect-error - run has wrong typings for esm
    isWatchMode && run(),
  ],
});
