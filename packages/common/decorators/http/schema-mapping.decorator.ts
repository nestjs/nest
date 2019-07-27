import { ROUTE_SCHEMA_METADATA } from '../../constants';
import { JsonSchemaMappingMetadata } from '../../interfaces/json-schema-mapping-metadata.interface';
import { RouteSchema } from 'fastify';

const defaultMetadata = {
  [ROUTE_SCHEMA_METADATA]: {}
};

export const JsonSchemaMapping = (
  metadata: JsonSchemaMappingMetadata = defaultMetadata,
): MethodDecorator => {
  const schemaMetadata = metadata[ROUTE_SCHEMA_METADATA];
  return (target, key, descriptor: PropertyDescriptor) => {
    Reflect.defineMetadata(ROUTE_SCHEMA_METADATA, schemaMetadata, descriptor.value);
    return descriptor;
  };
};

const createMappingDecorator = () => (
  schema?: RouteSchema,
): MethodDecorator => {
  return JsonSchemaMapping({
    [ROUTE_SCHEMA_METADATA]: schema || defaultMetadata,
  });
};

export const Schema = createMappingDecorator();
