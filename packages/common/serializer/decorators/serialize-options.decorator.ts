import { SetMetadata } from '../../decorators';
import { ClassTransformOptions } from '../../interfaces/external/class-transform-options.interface';
import { CLASS_SERIALIZER_OPTIONS } from '../class-serializer.constants';

export const SerializeOptions = (options: ClassTransformOptions) =>
  SetMetadata(CLASS_SERIALIZER_OPTIONS, options);
