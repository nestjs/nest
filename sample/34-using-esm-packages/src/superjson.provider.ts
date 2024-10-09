import { FactoryProvider } from '@nestjs/common';
import { importEsmPackage } from './import-esm-package';

// We must expose only the type definition!
export type { SuperJSON } from 'superjson';

export const superJSONProvider: FactoryProvider = {
  provide: 'SuperJSON',
  useFactory: () => importEsmPackage('superjson'),
};
