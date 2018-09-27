import { Container } from 'inversify';

import { InjectionToken } from './module/injection-token';
import { Type } from './interfaces';

export const APP_INIT = new InjectionToken<Promise<void>>('Initialize<App>');
export const APP_DESTROY = new InjectionToken<Promise<void>>('Destroy<App>');
export const MODULE_INIT = new InjectionToken<any>('Initialize<Module>');
export const NEST_MODULE = new InjectionToken<Type<any>>('Ref<Module>');

export class Injector extends Container {}
