import { Type } from '@nestjs/common';

export interface RouteTree {
  path: string;
  pathBeforeVersion?: boolean;
  module?: Type<any>;
  children?: (RouteTree | Type<any>)[];
}

export type Routes = RouteTree[];
