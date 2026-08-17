import { SetMetadata } from '../../decorators/index.js';
import { CLASS_SERIALIZER_OPTIONS } from '../class-serializer.constants.js';
import { ClassSerializerContextOptions } from '../class-serializer.interfaces.js';
import { StandardSchemaSerializerContextOptions } from '../standard-schema-serializer.interfaces.js';

/**
 * @publicApi
 */
export const SerializeOptions = (
  options:
    | ClassSerializerContextOptions
    | StandardSchemaSerializerContextOptions,
) => SetMetadata(CLASS_SERIALIZER_OPTIONS, options);
