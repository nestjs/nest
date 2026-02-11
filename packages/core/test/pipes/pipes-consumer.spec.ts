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
  });
});
