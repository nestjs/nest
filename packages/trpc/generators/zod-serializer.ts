/**
 * Serializes a Zod schema runtime object back to its source-code representation.
 *
 * This is used by the schema generator to reconstruct `z.xxx()` calls
 * in the auto-generated AppRouter file.
 *
 * @internal
 */
export function serializeZodSchema(schema: any): string {
  if (!schema || !schema._def) {
    return 'z.any()';
  }

  const { typeName } = schema._def;

  switch (typeName) {
    case 'ZodString':
      return 'z.string()';
    case 'ZodNumber':
      return 'z.number()';
    case 'ZodBoolean':
      return 'z.boolean()';
    case 'ZodBigInt':
      return 'z.bigint()';
    case 'ZodDate':
      return 'z.date()';
    case 'ZodUndefined':
      return 'z.undefined()';
    case 'ZodNull':
      return 'z.null()';
    case 'ZodVoid':
      return 'z.void()';
    case 'ZodAny':
      return 'z.any()';
    case 'ZodUnknown':
      return 'z.unknown()';
    case 'ZodNever':
      return 'z.never()';

    case 'ZodObject': {
      const shape =
        typeof schema._def.shape === 'function'
          ? schema._def.shape()
          : schema._def.shape;
      const entries = Object.entries(shape)
        .map(([key, value]) => {
          const serialized = serializeZodSchema(value);
          const safeKey = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(key)
            ? key
            : JSON.stringify(key);
          return `${safeKey}: ${serialized}`;
        })
        .join(', ');
      return `z.object({ ${entries} })`;
    }

    case 'ZodArray':
      return `z.array(${serializeZodSchema(schema._def.type)})`;

    case 'ZodOptional':
      return `${serializeZodSchema(schema._def.innerType)}.optional()`;

    case 'ZodNullable':
      return `${serializeZodSchema(schema._def.innerType)}.nullable()`;

    case 'ZodDefault':
      return `${serializeZodSchema(schema._def.innerType)}.default(${JSON.stringify(schema._def.defaultValue())})`;

    case 'ZodEnum':
      return `z.enum(${JSON.stringify(schema._def.values)})`;

    case 'ZodLiteral':
      return `z.literal(${JSON.stringify(schema._def.value)})`;

    case 'ZodUnion': {
      const options = schema._def.options
        .map((opt: any) => serializeZodSchema(opt))
        .join(', ');
      return `z.union([${options}])`;
    }

    case 'ZodDiscriminatedUnion': {
      const discriminator = JSON.stringify(schema._def.discriminator);
      const options = schema._def.options
        .map((opt: any) => serializeZodSchema(opt))
        .join(', ');
      return `z.discriminatedUnion(${discriminator}, [${options}])`;
    }

    case 'ZodIntersection':
      return `z.intersection(${serializeZodSchema(schema._def.left)}, ${serializeZodSchema(schema._def.right)})`;

    case 'ZodTuple': {
      const items = schema._def.items
        .map((item: any) => serializeZodSchema(item))
        .join(', ');
      const rest = schema._def.rest
        ? `.rest(${serializeZodSchema(schema._def.rest)})`
        : '';
      return `z.tuple([${items}])${rest}`;
    }

    case 'ZodRecord':
      return `z.record(${serializeZodSchema(schema._def.keyType)}, ${serializeZodSchema(schema._def.valueType)})`;

    case 'ZodMap':
      return `z.map(${serializeZodSchema(schema._def.keyType)}, ${serializeZodSchema(schema._def.valueType)})`;

    case 'ZodSet':
      return `z.set(${serializeZodSchema(schema._def.valueType)})`;

    case 'ZodPromise':
      return `z.promise(${serializeZodSchema(schema._def.type)})`;

    case 'ZodEffects':
      // Effects (transform, refine, preprocess) — serialize the inner schema.
      // The effect itself is runtime-only and doesn't affect the type used for inference.
      return serializeZodSchema(schema._def.schema);

    case 'ZodLazy':
      // Lazy schemas can't be serialized; fall back.
      return 'z.any()';

    case 'ZodPipeline':
      // For type inference, use the output schema.
      return serializeZodSchema(schema._def.out);

    case 'ZodBranded':
      return serializeZodSchema(schema._def.type);

    case 'ZodCatch':
      return serializeZodSchema(schema._def.innerType);

    case 'ZodReadonly':
      return `${serializeZodSchema(schema._def.innerType)}.readonly()`;

    case 'ZodNativeEnum':
      // Native enums reference runtime values that can't be reconstructed.
      return 'z.any()';

    default:
      return 'z.any()';
  }
}
