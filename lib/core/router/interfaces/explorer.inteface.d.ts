import { Controller } from '@nestjs/common/interfaces/index';
import { Type } from '@nestjs/common/interfaces/type.interface';
export interface RouterExplorer {
    explore(instance: Controller, metatype: Type<Controller>, module: string): any;
    fetchRouterPath(metatype: Type<Controller>, prefix?: string): string;
}
