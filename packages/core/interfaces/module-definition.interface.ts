import type { DynamicModule, ForwardReference } from '@nestjs/common';
import type { Type } from '@nestjs/common';

export type ModuleDefinition =
  | ForwardReference
  | Type<unknown>
  | DynamicModule
  | Promise<DynamicModule>;
