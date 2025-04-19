import { expect } from 'chai';
import { Schema } from '../../decorators/schema.decorator';
import { FASTIFY_SCHEMA_METADATA } from '../../constants';

describe('@Schema', () => {
  describe('has a metadata schema', () => {
    const schema = {
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
        },
        required: ['name'],
      },
    };
    class TestSchema {
      schema;
      @Schema(schema)
      public static test() {}
    }

    it('should set the schema metadata', () => {
      const metadata = Reflect.getMetadata(
        FASTIFY_SCHEMA_METADATA,
        TestSchema.test,
      );
      expect(metadata).to.deep.equal(schema);
    });
  });

  describe('has empty schema', () => {
    const schema = {};
    class TestSchema {
      schema;
      @Schema(schema)
      public static test() {}
    }
    it('should handle an empty schema', () => {
      const metadata = Reflect.getMetadata(
        FASTIFY_SCHEMA_METADATA,
        TestSchema.test,
      );
      expect(metadata).to.be.eq(schema);
    });
  });

  describe('has undefined schema', () => {
    const schema = undefined;
    class TestSchema {
      schema;
      @Schema(schema)
      public static test() {}
    }
    it('should handle an empty schema', () => {
      const metadata = Reflect.getMetadata(
        FASTIFY_SCHEMA_METADATA,
        TestSchema.test,
      );
      expect(metadata).to.be.eq(schema);
    });
  });
});
