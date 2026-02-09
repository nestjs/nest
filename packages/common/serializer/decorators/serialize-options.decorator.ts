import { SetMetadata } from '../../decorators/index.js';
import { ClassSerializerContextOptions } from '../class-serializer.interfaces.js';
import { CLASS_SERIALIZER_OPTIONS } from '../class-serializer.constants.js';

/**
 * @publicApi
 */
export const SerializeOptions = (options: ClassSerializerContextOptions) =>
  SetMetadata(CLASS_SERIALIZER_OPTIONS, options);
