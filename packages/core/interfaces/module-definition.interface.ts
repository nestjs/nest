import { DynamicModule, ForwardReference } from '@nestjs/common';
import { Type } from '@nestjs/common/interfaces';

export type ModuleDefinition =
  | ForwardReference
  | Type<unknown>
  | DynamicModule
  | Promise<DynamicModule>;
