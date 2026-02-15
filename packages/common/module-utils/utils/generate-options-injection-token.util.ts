import { randomStringGenerator } from '../../utils/random-string-generator.util.js';

export function generateOptionsInjectionToken() {
  const hash = randomStringGenerator();
  return `CONFIGURABLE_MODULE_OPTIONS[${hash}]`;
}
