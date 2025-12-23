import * as chai from 'chai';
import { expect } from 'chai';
import * as chaiAsPromised from 'chai-as-promised';
import { HttpStatus } from '../../enums';
import {
  BadRequestException,
  UnprocessableEntityException,
} from '../../exceptions';
import { ArgumentMetadata, StandardSchemaV1 } from '../../interfaces';
import {
  StandardSchemaValidationPipe,
  StandardSchemaIssue,
} from '../../pipes/standard-schema-validation.pipe';

chai.use(chaiAsPromised);

/**
 * Helper function to create a mock Standard Schema for testing.
 */
function createMockSchema<T>(
  validateFn: (
    value: unknown,
  ) => StandardSchemaV1.Result<T> | Promise<StandardSchemaV1.Result<T>>,
): StandardSchemaV1<unknown, T> {
  return {
    '~standard': {
      version: 1,
      vendor: 'test',
      validate: validateFn,
    },
  };
}

/**
 * Test DTO with a valid static schema.
 */
class TestDto {
  static schema = createMockSchema<{ name: string; email: string }>(value => {
    const obj = value as Record<string, unknown>;
    const issues: StandardSchemaV1.Issue[] = [];

    if (typeof obj.name !== 'string') {
      issues.push({ message: 'name must be a string', path: ['name'] });
    }
    if (typeof obj.email !== 'string') {
      issues.push({ message: 'email must be a string', path: ['email'] });
    } else if (!obj.email.includes('@')) {
      issues.push({ message: 'email must be valid', path: ['email'] });
    }

    if (issues.length > 0) {
      return { issues };
    }
    return { value: obj as { name: string; email: string } };
  });

  name: string;
  email: string;
}

/**
 * Test DTO with async validation.
 */
class TestAsyncDto {
  static schema = createMockSchema<{ id: number }>(async value => {
    await new Promise(resolve => setTimeout(resolve, 1));
    const obj = value as Record<string, unknown>;

    if (typeof obj.id !== 'number') {
      return { issues: [{ message: 'id must be a number', path: ['id'] }] };
    }
    return { value: obj as { id: number } };
  });

  id: number;
}

/**
 * Test DTO without schema property.
 */
class TestDtoNoSchema {
  prop: string;
}

/**
 * Test DTO with custom schema property name.
 */
class TestDtoCustomSchemaProperty {
  static validator = createMockSchema<{ value: string }>(value => {
    const obj = value as Record<string, unknown>;
    if (typeof obj.value !== 'string') {
      return {
        issues: [{ message: 'value must be a string', path: ['value'] }],
      };
    }
    return { value: obj as { value: string } };
  });

  value: string;
}

/**
 * Test DTO with nested path in validation errors.
 */
class TestDtoNestedPath {
  static schema = createMockSchema<{ user: { profile: { age: number } } }>(
    value => {
      const obj = value as any;
      if (typeof obj?.user?.profile?.age !== 'number') {
        return {
          issues: [
            {
              message: 'age must be a number',
              path: ['user', { key: 'profile' }, 'age'],
            },
          ],
        };
      }
      return { value: obj };
    },
  );
}

/**
 * Test DTO that transforms the value.
 */
class TestDtoTransform {
  static schema = createMockSchema<{ name: string }>(value => {
    const obj = value as Record<string, unknown>;
    if (typeof obj.name !== 'string') {
      return { issues: [{ message: 'name must be a string', path: ['name'] }] };
    }
    // Transform: uppercase the name
    return { value: { name: obj.name.toUpperCase() } };
  });

  name: string;
}

describe('StandardSchemaValidationPipe', () => {
  let target: StandardSchemaValidationPipe;

  const metadata: ArgumentMetadata = {
    type: 'body',
    metatype: TestDto,
    data: '',
  };

  describe('transform', () => {
    describe('when validation passes', () => {
      beforeEach(() => {
        target = new StandardSchemaValidationPipe();
      });

      it('should return the validated value', async () => {
        const testObj = { name: 'John', email: 'john@example.com' };
        const result = await target.transform(testObj, metadata);
        expect(result).to.deep.equal(testObj);
      });

      it('should return the value unchanged when metatype has no schema', async () => {
        const testObj = { prop: 'value' };
        const result = await target.transform(testObj, {
          ...metadata,
          metatype: TestDtoNoSchema,
        });
        expect(result).to.equal(testObj);
      });

      it('should return the value unchanged when metatype is undefined', async () => {
        const testObj = { prop: 'value' };
        const result = await target.transform(testObj, {
          ...metadata,
          metatype: undefined,
        });
        expect(result).to.equal(testObj);
      });

      it('should return the value unchanged for primitive types', async () => {
        const result = await target.transform('test', {
          ...metadata,
          metatype: String,
        });
        expect(result).to.equal('test');
      });
    });

    describe('when validation fails', () => {
      beforeEach(() => {
        target = new StandardSchemaValidationPipe();
      });

      it('should throw BadRequestException', async () => {
        const testObj = { name: 123, email: 'invalid' };
        await expect(target.transform(testObj, metadata)).to.be.rejectedWith(
          BadRequestException,
        );
      });

      it('should include error messages in exception', async () => {
        const testObj = { name: 123, email: 'invalid' };
        try {
          await target.transform(testObj, metadata);
          expect.fail('Should have thrown');
        } catch (err) {
          const response = err.getResponse();
          expect(response.message).to.be.an('array');
          expect(response.message).to.include('name: name must be a string');
        }
      });

      it('should format nested paths correctly', async () => {
        const testObj = { user: { profile: { age: 'not a number' } } };
        try {
          await target.transform(testObj, {
            ...metadata,
            metatype: TestDtoNestedPath,
          });
          expect.fail('Should have thrown');
        } catch (err) {
          const response = err.getResponse();
          expect(response.message).to.include(
            'user.profile.age: age must be a number',
          );
        }
      });
    });

    describe('when validation transforms the value', () => {
      beforeEach(() => {
        target = new StandardSchemaValidationPipe();
      });

      it('should return the transformed value', async () => {
        const testObj = { name: 'john' };
        const result = await target.transform(testObj, {
          ...metadata,
          metatype: TestDtoTransform,
        });
        expect(result).to.deep.equal({ name: 'JOHN' });
      });
    });

    describe('with async validation', () => {
      beforeEach(() => {
        target = new StandardSchemaValidationPipe();
      });

      it('should handle async validation', async () => {
        const testObj = { id: 42 };
        const result = await target.transform(testObj, {
          ...metadata,
          metatype: TestAsyncDto,
        });
        expect(result).to.deep.equal(testObj);
      });

      it('should handle async validation failure', async () => {
        const testObj = { id: 'not a number' };
        await expect(
          target.transform(testObj, {
            ...metadata,
            metatype: TestAsyncDto,
          }),
        ).to.be.rejectedWith(BadRequestException);
      });
    });
  });

  describe('options', () => {
    describe('errorHttpStatusCode', () => {
      it('should use custom HTTP status code', async () => {
        target = new StandardSchemaValidationPipe({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        });

        const testObj = { name: 123, email: 'invalid' };
        try {
          await target.transform(testObj, metadata);
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err).to.be.instanceOf(UnprocessableEntityException);
        }
      });
    });

    describe('disableErrorMessages', () => {
      it('should not include error messages when disabled', async () => {
        target = new StandardSchemaValidationPipe({
          disableErrorMessages: true,
        });

        const testObj = { name: 123, email: 'invalid' };
        try {
          await target.transform(testObj, metadata);
          expect.fail('Should have thrown');
        } catch (err) {
          const response = err.getResponse();
          expect(response.message).to.equal('Bad Request');
        }
      });
    });

    describe('exceptionFactory', () => {
      it('should use custom exception factory', async () => {
        const customError = new Error('Custom validation error');
        target = new StandardSchemaValidationPipe({
          exceptionFactory: (issues: StandardSchemaIssue[]) => customError,
        });

        const testObj = { name: 123, email: 'invalid' };
        try {
          await target.transform(testObj, metadata);
          expect.fail('Should have thrown');
        } catch (err) {
          expect(err).to.equal(customError);
        }
      });

      it('should pass issues to custom exception factory', async () => {
        let receivedIssues: StandardSchemaIssue[] = [];
        target = new StandardSchemaValidationPipe({
          exceptionFactory: (issues: StandardSchemaIssue[]) => {
            receivedIssues = issues;
            return new Error('test');
          },
        });

        const testObj = { name: 123, email: 'invalid' };
        try {
          await target.transform(testObj, metadata);
        } catch {
          // Expected
        }

        expect(receivedIssues).to.have.length(2);
        expect(receivedIssues[0].path).to.equal('name');
        expect(receivedIssues[1].path).to.equal('email');
      });
    });

    describe('validateCustomDecorators', () => {
      it('should skip custom decorators by default', async () => {
        target = new StandardSchemaValidationPipe();

        const testObj = { invalid: 'data' };
        const result = await target.transform(testObj, {
          ...metadata,
          type: 'custom',
        });
        expect(result).to.equal(testObj);
      });

      it('should validate custom decorators when enabled', async () => {
        target = new StandardSchemaValidationPipe({
          validateCustomDecorators: true,
        });

        const testObj = { name: 123, email: 'invalid' };
        await expect(
          target.transform(testObj, {
            ...metadata,
            type: 'custom',
          }),
        ).to.be.rejectedWith(BadRequestException);
      });
    });

    describe('schemaProperty', () => {
      it('should use custom schema property name', async () => {
        target = new StandardSchemaValidationPipe({
          schemaProperty: 'validator',
        });

        const testObj = { value: 'test' };
        const result = await target.transform(testObj, {
          ...metadata,
          metatype: TestDtoCustomSchemaProperty,
        });
        expect(result).to.deep.equal(testObj);
      });

      it('should validate using custom schema property', async () => {
        target = new StandardSchemaValidationPipe({
          schemaProperty: 'validator',
        });

        const testObj = { value: 123 };
        await expect(
          target.transform(testObj, {
            ...metadata,
            metatype: TestDtoCustomSchemaProperty,
          }),
        ).to.be.rejectedWith(BadRequestException);
      });
    });
  });

  describe('isStandardSchema type guard', () => {
    beforeEach(() => {
      target = new StandardSchemaValidationPipe();
    });

    it('should return value unchanged for non-Standard Schema object', async () => {
      class DtoWithInvalidSchema {
        static schema = { notAValidSchema: true };
      }

      const testObj = { prop: 'value' };
      const result = await target.transform(testObj, {
        ...metadata,
        metatype: DtoWithInvalidSchema,
      });
      expect(result).to.equal(testObj);
    });

    it('should return value unchanged for null schema', async () => {
      class DtoWithNullSchema {
        static schema = null;
      }

      const testObj = { prop: 'value' };
      const result = await target.transform(testObj, {
        ...metadata,
        metatype: DtoWithNullSchema,
      });
      expect(result).to.equal(testObj);
    });
  });
});
