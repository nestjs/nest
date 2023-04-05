import { SetMetadata } from '../../decorators';
import { ClassSerializerContextOptions } from '../class-serializer.interfaces';
import { CLASS_SERIALIZER_OPTIONS } from '../class-serializer.constants';

/**
 * @publicApi
 */
export const SerializeOptions = (options: ClassSerializerContextOptions) =>
  SetMetadata(CLASS_SERIALIZER_OPTIONS, options);
