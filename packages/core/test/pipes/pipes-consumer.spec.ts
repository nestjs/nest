import { RouteParamtypes } from '../../../common/enums/route-paramtypes.enum.js';
import { PipesConsumer } from '../../pipes/pipes-consumer.js';

const createPipe = (transform: Function) => ({ transform });

describe('PipesConsumer', () => {
  let consumer: PipesConsumer;
  beforeEach(() => {
    consumer = new PipesConsumer();
  });
  describe('apply', () => {
    let value, metatype, type, stringifiedType, transforms, data;
    beforeEach(() => {
      value = 0;
      data = null;
      ((metatype = {}), (type = RouteParamtypes.QUERY));
      stringifiedType = 'query';
      transforms = [
        createPipe(vi.fn().mockImplementation(val => val + 1)),
        createPipe(vi.fn().mockImplementation(val => Promise.resolve(val + 1))),
        createPipe(vi.fn().mockImplementation(val => val + 1)),
      ];
    });
    it('should call all transform functions', () =>
      new Promise<void>(done => {
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        consumer.apply(value, { metatype, type, data }, transforms).then(() => {
          expect(
            transforms.reduce(
              (prev, next) => prev && next.transform.mock.calls.length > 0,
              true,
            ),
          ).toBe(true);

          done();
        });
      }));
    it('should return expected result', () =>
      new Promise<void>(done => {
        const expectedResult = 3;
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        consumer
          .apply(value, { metatype, type, data }, transforms)
          .then(result => {
            expect(result).toEqual(expectedResult);
            done();
          });
      }));

    describe('schema propagation', () => {
      it('should pass schema to each pipe transform', async () => {
        const mockSchema = {
          '~standard': {
            version: 1 as const,
            vendor: 'test',
            validate: (v: unknown) => ({ value: v }),
          },
        };
        const receivedMetadata: any[] = [];
        const pipesWithSchema = [
          createPipe(
            vi.fn().mockImplementation((val, metadata) => {
              receivedMetadata.push(metadata);
              return val;
            }),
          ),
          createPipe(
            vi.fn().mockImplementation((val, metadata) => {
              receivedMetadata.push(metadata);
              return val;
            }),
          ),
        ];

        await consumer.apply(
          'testValue',
          { metatype: String, type, data: 'testData', schema: mockSchema },
          pipesWithSchema as any,
        );

        expect(receivedMetadata).toHaveLength(2);
        for (const metadata of receivedMetadata) {
          expect(metadata.schema).toBe(mockSchema);
          expect(metadata.data).toBe('testData');
          expect(metadata.type).toBe('query');
        }
      });

      it('should work without schema (schema is undefined)', async () => {
        const receivedMetadata: any[] = [];
        const pipes = [
          createPipe(
            vi.fn().mockImplementation((val, metadata) => {
              receivedMetadata.push(metadata);
              return val;
            }),
          ),
        ];

        await consumer.apply(
          'testValue',
          { metatype: String, type, data: 'testData' },
          pipes as any,
        );

        expect(receivedMetadata).toHaveLength(1);
        expect(receivedMetadata[0].schema).toBeUndefined();
      });
    });
  });
});
