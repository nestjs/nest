import { DynamicModule, ForwardReference } from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces/index.js';

export type ModuleDefinition =
  | ForwardReference
  | Type<unknown>
  | DynamicModule
  | Promise<DynamicModule>;
