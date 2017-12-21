import {
  MicroserviceConfiguration,
  CustomTransportStrategy
} from '../interfaces';
import { Server } from './server';
export declare class ServerFactory {
  static create(
    config: MicroserviceConfiguration
  ): Server & CustomTransportStrategy;
}
