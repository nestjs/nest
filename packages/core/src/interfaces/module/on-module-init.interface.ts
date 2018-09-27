import { Type } from '../type.interface';
import { NestModule } from '../../module';

export interface OnModuleInit extends Type<NestModule> {
  onModuleInit(): any;
}
