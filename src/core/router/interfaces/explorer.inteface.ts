import { Controller } from '@nestjs/common/interfaces/index';
import { Metatype } from '@nestjs/common/interfaces/metatype.interface';
import { Router } from 'express';

export interface RouterExplorer {
    explore(instance: Controller, metatype: Metatype<Controller>, module: string): Router;
    fetchRouterPath(metatype: Metatype<Controller>): string;
}
