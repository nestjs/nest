import { ValueProvider } from '@nestjs/common';
import { SuperJSON } from 'superjson';

export const superJSONProvider = {
  provide: 'SuperJSON',
  useValue: SuperJSON,
} satisfies ValueProvider;
