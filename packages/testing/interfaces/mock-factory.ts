import { InstanceToken } from '@nestjs/core/injector/module';

export type MockFactory = (token?: InstanceToken) => any;
