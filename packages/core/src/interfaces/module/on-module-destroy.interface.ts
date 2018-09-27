import { Type } from '../type.interface';
import { NestModule } from '../../module';

export interface OnModuleDestroy extends Type<NestModule> {
  onModuleDestroy(): any;
}
