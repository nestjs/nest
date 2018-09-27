// @ts-ignore
import { InjectionToken } from '@nest/core';
import { AxiosAdapter } from 'axios';

export const AXIOS_INSTANCE_TOKEN = new InjectionToken<AxiosAdapter>(
  'AXIOS_INSTANCE_TOKEN',
);
