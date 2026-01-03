import { Type } from '@nestjs/common';

export interface RouteTree {
  path: string | string[];
  module?: Type<any>;
  children?: (RouteTree | Type<any>)[];
}

export type Routes = RouteTree[];
