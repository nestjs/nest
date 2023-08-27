import { expect } from 'chai';
import { Reflector } from '../../services/reflector.service';

const transformDecorator = Reflector.createDecorator<string[], number>({
  transform: value => value.length,
});

describe('Reflector', () => {
  let reflector: Reflector;

  class Test {}

  @transformDecorator(['a', 'b', 'c'])
  class TestTransform {}

  beforeEach(() => {
    reflector = new Reflector();
  });

  describe('get', () => {
    it('should reflect metadata by key', () => {
      const key = 'key';
      const value = 'value';
      Reflect.defineMetadata(key, value, Test);
      expect(reflector.get(key, Test)).to.eql(value);
    });

    it('should reflect metadata by decorator', () => {
      const decorator = Reflector.createDecorator<string>();
      const value = 'value';
      Reflect.defineMetadata(decorator.KEY, value, Test);

      let reflectedValue = reflector.get(decorator, Test);
      expect(reflectedValue).to.eql(value);

      // @ts-expect-error 'value' is not assignable to parameter of type 'string'
      reflectedValue = true;
    });

    it('should reflect metadata by decorator (custom key)', () => {
      const decorator = Reflector.createDecorator<string[]>({ key: 'custom' });
      const value = ['value'];
      Reflect.defineMetadata('custom', value, Test);

      let reflectedValue = reflector.get(decorator, Test);
      expect(reflectedValue).to.eql(value);

      // @ts-expect-error 'value' is not assignable to parameter of type 'string[]'
      reflectedValue = true;
    });

    it('should reflect metadata by decorator (with transform option)', () => {
      let reflectedValue = reflector.get(transformDecorator, TestTransform);
      expect(reflectedValue).to.eql(3);

      // @ts-expect-error 'value' is not assignable to type 'number'
      reflectedValue = [];
    });

    it('should require transform option when second generic type is provided', () => {
      // @ts-expect-error Property 'transform' is missing in type {} but required in type
      const decorator = Reflector.createDecorator<string[], number>({});
    });
  });

  describe('getAll', () => {
    it('should reflect metadata of all targets', () => {
      const key = 'key';
      const value = 'value';
      Reflect.defineMetadata(key, value, Test);
      expect(reflector.getAll(key, [Test])).to.eql([value]);
    });
  });

  describe('getAllAndMerge', () => {
    it('should return an empty array when there are no targets', () => {
      const key = 'key';
      expect(reflector.getAllAndMerge(key, [])).to.be.empty;
    });
    it('should reflect metadata of all targets and concat arrays', () => {
      const key = 'key';
      const value = 'value';
      Reflect.defineMetadata(key, [value], Test);
      expect(reflector.getAllAndMerge(key, [Test, Test])).to.eql([
        value,
        value,
      ]);
    });
    it('should reflect metadata of all targets and create an array', () => {
      const key = 'key';
      const value = 'value';
      Reflect.defineMetadata(key, value, Test);
      expect(reflector.getAllAndMerge(key, [Test, Test])).to.eql([
        value,
        value,
      ]);
    });
    it('should reflect metadata of all targets and merge an object', () => {
      const key = 'key';
      const value = { test: 'test' };
      Reflect.defineMetadata(key, value, Test);
      expect(reflector.getAllAndMerge(key, [Test, Test])).to.eql({
        ...value,
      });
    });
  });

  describe('getAllAndOverride', () => {
    it('should reflect metadata of all targets and return a first not undefined value', () => {
      const key = 'key';
      const value = 'value';
      Reflect.defineMetadata(key, value, Test);
      expect(reflector.getAllAndOverride(key, [Test, Test])).to.eql(value);
    });
  });
});
