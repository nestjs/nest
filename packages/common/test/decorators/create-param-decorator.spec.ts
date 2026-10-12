import { ROUTE_ARGS_METADATA } from '../../constants.js';
import { createParamDecorator } from '../../decorators/http/create-route-param-metadata.decorator.js';
import { ParseIntPipe } from '../../index.js';

describe('createParamDecorator', () => {
  let result;

  beforeEach(() => {
    const fn = (data, req) => true;
    result = createParamDecorator(fn);
  });
  it('should return a function as a first element', () => {
    expect(result).toBeTypeOf('function');
  });
  describe('returned decorator', () => {
    const factoryFn = (data, req) => true;
    const Decorator = createParamDecorator(factoryFn);

    describe('when 0 pipes have been passed', () => {
      const data = { data: 'test' };
      class Test {
        public test(@Decorator(data) param) {}
      }
      it('should enhance param with "data"', () => {
        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).toEqual({
          data,
          factory: factoryFn,
          index: 0,
          pipes: [],
        });
      });
    });

    describe('when custom data contains schema or pipes properties', () => {
      const schema = {
        '~standard': {
          version: 1 as const,
          vendor: 'test',
          validate: (value: unknown) => ({ value }),
        },
      };

      it.each([
        // Keys other than schema and pipes make the object custom data
        ['a schema string and another key', { schema: 'public', region: 'eu' }],
        ['a pipes string and another key', { pipes: 'water', region: 'eu' }],
        [
          'an array of non-pipes and another key',
          { pipes: ['stage1', 'stage2'], region: 'eu' },
        ],
        [
          'an array of real pipes and another key',
          { pipes: [new ParseIntPipe()], region: 'eu' },
        ],
        ['an empty pipes array and another key', { pipes: [], region: 'eu' }],
        [
          'an undefined schema and another key',
          { schema: undefined, region: 'eu' },
        ],
        ['a valid schema and another key', { schema, region: 'eu' }],
        // Only schema and pipes keys, but values that are not valid options
        ['only a schema string', { schema: 'public' }],
        ['only a schema object', { schema: { name: 'public' } }],
        ['only a null schema', { schema: null }],
        [
          'only a schema with a non-callable validator',
          { schema: { '~standard': { validate: true } } },
        ],
        ['only a pipes string', { pipes: 'water' }],
        ['only a pipes number', { pipes: 42 }],
        ['only an array of non-pipes', { pipes: ['stage1', 'stage2'] }],
        [
          'only an array mixing pipes and non-pipes',
          { pipes: [new ParseIntPipe(), 'stage2'] },
        ],
        [
          'only a schema string and a pipes array',
          { schema: 'public', pipes: [] },
        ],
        ['only a valid schema and a pipes string', { schema, pipes: 'water' }],
      ])('should preserve data containing %s', (_, data) => {
        class Test {
          public test(@Decorator(data) param) {}
        }

        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
        const key = Object.keys(metadata)[0];
        expect(metadata[key].data).toBe(data);
        expect(metadata[key].pipes).toEqual([]);
        expect(metadata[key]).not.toHaveProperty('schema');
      });

      it.each([
        ['instance', new ParseIntPipe()],
        ['class', ParseIntPipe],
      ])('should preserve custom data with a positional pipe %s', (_, pipe) => {
        const data = { schema: 'public', region: 'eu' };
        class Test {
          public test(@Decorator(data, pipe) param) {}
        }

        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
        const key = Object.keys(metadata)[0];
        expect(metadata[key].data).toBe(data);
        expect(metadata[key].pipes).toEqual([pipe]);
        expect(metadata[key]).not.toHaveProperty('schema');
      });

      it('should preserve custom data with trailing schema and pipe options', () => {
        const data = { schema: 'public', region: 'eu' };
        const pipe = new ParseIntPipe();
        class Test {
          public test(@Decorator(data, { schema, pipes: [pipe] }) param) {}
        }

        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
        const key = Object.keys(metadata)[0];
        expect(metadata[key].data).toBe(data);
        expect(metadata[key].schema).toBe(schema);
        expect(metadata[key].pipes).toEqual([pipe]);
      });
    });

    describe('when > 0 pipes have been passed', () => {
      const data = 'test';
      const pipe = new ParseIntPipe();
      class Test {
        public test(
          @Decorator(data, pipe)
          param,
        ) {}

        public testNoData(@Decorator(pipe) param) {}

        public testNoDataClass(@Decorator(ParseIntPipe) param) {}
      }
      it('should enhance param with "data" and ParseIntPipe', () => {
        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).toEqual({
          data: 'test',
          factory: factoryFn,
          index: 0,
          pipes: [pipe],
        });
      });

      it('should enhance param with ParseIntPipe', () => {
        const metadata = Reflect.getMetadata(
          ROUTE_ARGS_METADATA,
          Test,
          'testNoData',
        );
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).toEqual({
          data: undefined,
          factory: factoryFn,
          index: 0,
          pipes: [pipe],
        });
      });

      it('should enhance param with ParseIntPipe metatype', () => {
        const metadata = Reflect.getMetadata(
          ROUTE_ARGS_METADATA,
          Test,
          'testNoDataClass',
        );
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).toEqual({
          data: undefined,
          factory: factoryFn,
          index: 0,
          pipes: [ParseIntPipe],
        });
      });
    });

    describe('when class type passed as data', () => {
      class Data {}
      class Test {
        public test(@Decorator(Data) prop) {}
      }

      it('should return class type as data parameter', () => {
        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
        const key = Object.keys(metadata)[0];
        expect(metadata[key].data).toBe(Data);
      });
    });

    describe('when options object with schema is passed', () => {
      const mockSchema = {
        '~standard': {
          version: 1,
          vendor: 'test',
          validate: (v: unknown) => ({ value: v }),
        },
      };

      it('should accept options with a schema and pipe classes and instances', () => {
        const pipe = new ParseIntPipe();
        class Test {
          public test(
            @Decorator({ schema: mockSchema, pipes: [ParseIntPipe, pipe] })
            param,
          ) {}
        }

        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).toEqual({
          data: undefined,
          factory: factoryFn,
          index: 0,
          pipes: [ParseIntPipe, pipe],
          schema: mockSchema,
        });
      });

      it('should accept pipes-only options before positional pipes', () => {
        const pipe = new ParseIntPipe();
        class Test {
          public test(@Decorator({ pipes: [pipe] }, ParseIntPipe) param) {}
        }

        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).toEqual({
          data: undefined,
          factory: factoryFn,
          index: 0,
          pipes: [pipe, ParseIntPipe],
        });
      });

      it('should accept an empty pipes array as options', () => {
        class Test {
          public test(@Decorator({ pipes: [] }) param) {}
        }

        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).toEqual({
          data: undefined,
          factory: factoryFn,
          index: 0,
          pipes: [],
        });
      });

      it('should accept a callable Standard Schema in options', () => {
        const schema = Object.assign((value: unknown) => value, {
          '~standard': mockSchema['~standard'],
        });
        class Test {
          public test(@Decorator({ schema }) param) {}
        }

        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
        const key = Object.keys(metadata)[0];
        expect(metadata[key].data).toBeUndefined();
        expect(metadata[key].schema).toBe(schema);
        expect(metadata[key].pipes).toEqual([]);
      });

      it.each([
        ['schema', { schema: undefined }],
        ['pipes', { pipes: undefined }],
        ['both', { schema: undefined, pipes: undefined }],
      ])('should retain options with undefined %s fields', (_, options) => {
        class Test {
          public test(@Decorator(options) param) {}
        }

        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).toEqual({
          data: undefined,
          factory: factoryFn,
          index: 0,
          pipes: [],
        });
      });

      describe('with data and schema option', () => {
        const data = 'testData';
        class Test {
          public test(
            @Decorator(data, { schema: mockSchema })
            param,
          ) {}
        }
        it('should enhance param with "data" and "schema"', () => {
          const metadata = Reflect.getMetadata(
            ROUTE_ARGS_METADATA,
            Test,
            'test',
          );
          const key = Object.keys(metadata)[0];
          expect(metadata[key]).toEqual({
            data: 'testData',
            factory: factoryFn,
            index: 0,
            pipes: [],
            schema: mockSchema,
          });
        });
      });

      describe('with schema option only (no data)', () => {
        class Test {
          public test(
            @Decorator({ schema: mockSchema })
            param,
          ) {}
        }
        it('should enhance param with schema and no data', () => {
          const metadata = Reflect.getMetadata(
            ROUTE_ARGS_METADATA,
            Test,
            'test',
          );
          const key = Object.keys(metadata)[0];
          expect(metadata[key]).toEqual({
            data: undefined,
            factory: factoryFn,
            index: 0,
            pipes: [],
            schema: mockSchema,
          });
        });
      });

      describe('with options whose pipes contain an undefined entry (no data)', () => {
        const pipe = new ParseIntPipe();
        class Test {
          public test(
            @Decorator({ schema: mockSchema, pipes: [pipe, undefined as any] })
            param,
          ) {}
        }
        it('should still treat the object as options', () => {
          const metadata = Reflect.getMetadata(
            ROUTE_ARGS_METADATA,
            Test,
            'test',
          );
          const key = Object.keys(metadata)[0];
          expect(metadata[key].data).toBeUndefined();
          expect(metadata[key].schema).toBe(mockSchema);
          expect(metadata[key].pipes).toContain(pipe);
        });
      });

      describe('with data, pipes, and schema option', () => {
        const data = 'testData';
        const pipe = new ParseIntPipe();
        class Test {
          public test(
            @Decorator(data, pipe, { schema: mockSchema })
            param,
          ) {}
        }
        it('should enhance param with "data", pipes, and schema', () => {
          const metadata = Reflect.getMetadata(
            ROUTE_ARGS_METADATA,
            Test,
            'test',
          );
          const key = Object.keys(metadata)[0];
          expect(metadata[key]).toEqual({
            data: 'testData',
            factory: factoryFn,
            index: 0,
            pipes: [pipe],
            schema: mockSchema,
          });
        });
      });

      describe('with pipes in options object', () => {
        const data = 'testData';
        const pipe = new ParseIntPipe();
        class Test {
          public test(
            @Decorator(data, { schema: mockSchema, pipes: [pipe] })
            param,
          ) {}
        }
        it('should enhance param with "data", pipes from options, and schema', () => {
          const metadata = Reflect.getMetadata(
            ROUTE_ARGS_METADATA,
            Test,
            'test',
          );
          const key = Object.keys(metadata)[0];
          expect(metadata[key]).toEqual({
            data: 'testData',
            factory: factoryFn,
            index: 0,
            pipes: [pipe],
            schema: mockSchema,
          });
        });
      });

      describe('with options containing only pipes (no schema)', () => {
        const data = 'testData';
        const pipe = new ParseIntPipe();
        class Test {
          public test(
            @Decorator(data, { pipes: [pipe] })
            param,
          ) {}
        }
        it('should enhance param with "data" and pipes from options', () => {
          const metadata = Reflect.getMetadata(
            ROUTE_ARGS_METADATA,
            Test,
            'test',
          );
          const key = Object.keys(metadata)[0];
          expect(metadata[key]).toEqual({
            data: 'testData',
            factory: factoryFn,
            index: 0,
            pipes: [pipe],
          });
        });
      });
    });
  });

  describe('returned generic typed decorator', () => {
    const factoryFn = (data, req) => true;
    interface User {
      name: string;
    }

    const stringOnlyDecorator = createParamDecorator<string>(factoryFn);
    const stringOrNumberDecorator = createParamDecorator<string | number>(
      factoryFn,
    );
    const customTypeDecorator = createParamDecorator<User>(factoryFn);

    describe('when string is passed to stringOnlyDecorator', () => {
      const data = 'test';
      class Test {
        public test(
          @stringOnlyDecorator(data)
          param,
        ) {}
      }
      it('should enhance param with "data" as string', () => {
        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).toEqual({
          data: 'test',
          factory: factoryFn,
          index: 0,
          pipes: [],
        });
      });
    });

    describe('when number is passed to stringOrNumberDecorator', () => {
      const data = 10;
      class Test {
        public test(
          @stringOrNumberDecorator(data)
          param,
        ) {}
      }
      it('should enhance param with "data" as number', () => {
        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).toEqual({
          data: 10,
          factory: factoryFn,
          index: 0,
          pipes: [],
        });
      });
    });
    describe('when a custom Type is passed to customTypeDecorator', () => {
      const data = { name: 'john' };
      class Test {
        public test(
          @customTypeDecorator(data)
          param,
        ) {}
      }
      it('should enhance param with "data" as custom Type', () => {
        const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, Test, 'test');
        const key = Object.keys(metadata)[0];
        expect(metadata[key]).toEqual({
          data: { name: 'john' },
          factory: factoryFn,
          index: 0,
          pipes: [],
        });
      });
    });
  });

  describe('when enhancers are passed', () => {
    it('should apply each enhancer to the decorated parameter', () => {
      const factoryFn = (data, req) => true;
      const enhancer = vi.fn();
      const anotherEnhancer = vi.fn();
      const Decorator = createParamDecorator(factoryFn, [
        enhancer,
        anotherEnhancer,
      ]);

      class Test {
        public test(@Decorator() param) {}
      }

      expect(enhancer).toHaveBeenCalledExactlyOnceWith(
        Test.prototype,
        'test',
        0,
      );
      expect(anotherEnhancer).toHaveBeenCalledExactlyOnceWith(
        Test.prototype,
        'test',
        0,
      );
    });
  });
});
