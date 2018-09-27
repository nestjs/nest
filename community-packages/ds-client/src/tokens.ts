import { InjectionToken } from '@nest/core';

import { DsClient } from './ds-client.interface';
import { DsClientConfig } from './ds-client-config.interface';

export const DEEPSTREAM_CLIENT = new InjectionToken<DsClient>(
  'DEEPSTREAM_CLIENT',
);
export const DEEPSTREAM_CLIENT_CONFIG = new InjectionToken<DsClientConfig>(
  'DEEPSTREAM_CLIENT_CONFIG',
);
