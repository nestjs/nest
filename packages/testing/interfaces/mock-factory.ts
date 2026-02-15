import type { InjectionToken } from '@nestjs/common';

export type MockFactory = (token?: InjectionToken) => any;
