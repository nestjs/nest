import { Controller } from '../../interfaces/index';
import { Metatype } from '../../interfaces/metatype.interface';

export interface RouterExplorer {
    explore(instance: Controller, metatype: Metatype<Controller>, module: string);
}
