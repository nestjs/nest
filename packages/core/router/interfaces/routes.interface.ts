import { Type } from '@nestjs/common';

export interface RouteTree {
  path: string;
  module?: Type<any>;
  children?: Routes | Type<any>[];
}

export type Routes = RouteTree[];
