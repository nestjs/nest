import 'reflect-metadata';
import { Controller } from './controller.decorator';

/**
 * Defines the Controller. The controller can inject dependencies through constructor.
 * Those dependencies have to belong to the same module.
 */
export const Router = Controller;
