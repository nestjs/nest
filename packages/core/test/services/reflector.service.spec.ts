import { expect } from 'chai';
import { Reflector } from '../../services/reflector.service';

const transformDecorator = Reflector.createDecorator<string[], number>({
  transform: value => value.length,
});

type TestObject = {
  only1?: string;
  only2?: string;
  both: string;
};

describe('Reflector', () => {
  const key = 'key';
  let reflector: Reflector;

  @transformDecorator(['a', 'b', 'c'])
  class TestTransform {}
  class Test {}
  class Test1 {}
  class Test2 {}

  beforeEach(() => {
    Reflect.deleteMetadata(key, Test1);
    Reflect.deleteMetadata(key, Test2);
    reflector = new Reflector();
  });

  describe('get', () => {
    it('should reflect metadata by key', () => {
      const value = 'value';
      Reflect.defineMetadata(key, value, Test1);
      expect(reflector.get(key, Test1)).to.eql(value);
    });

    it('should reflect metadata by decorator', () => {
      const decorator = Reflector.createDecorator<string>();
      const value = 'value';
      Reflect.defineMetadata(decorator.KEY, value, Test1);

      // string
      let reflectedValue = reflector.get(decorator, Test1);
      expect(reflectedValue).to.eql(value);

      // @ts-expect-error 'value' is not assignable to parameter of type 'string'
      reflectedValue = true;

      reflectedValue satisfies string;
    });

    it('should reflect metadata by decorator (custom key)', () => {
      const decorator = Reflector.createDecorator<string[]>({ key: 'custom' });
      const value = ['value'];
      Reflect.defineMetadata('custom', value, Test1);

      // string[]
      let reflectedValue = reflector.get(decorator, Test1);
      expect(reflectedValue).to.eql(value);

      // @ts-expect-error 'value' is not assignable to parameter of type 'string[]'
      reflectedValue = true;

      reflectedValue satisfies string[];
    });

    it('should reflect metadata by decorator (with transform option)', () => {
      let reflectedValue = reflector.get(transformDecorator, TestTransform);
      expect(reflectedValue).to.eql(3);

      // @ts-expect-error 'value' is not assignable to type 'number'
      reflectedValue = [];

      reflectedValue satisfies number;
    });

    it('should require transform option when second generic type is provided', () => {
      // @ts-expect-error Property 'transform' is missing in type {} but required in type
      const decorator = Reflector.createDecorator<string[], number>({});
    });
  });

  describe('getAll', () => {
    it('should reflect metadata of all targets by key', () => {
      const value1 = 'value1';
      const value2 = 'value2';
      Reflect.defineMetadata(key, value1, Test1);
      Reflect.defineMetadata(key, value2, Test2);
      expect(reflector.getAll(key, [Test1, Test2])).to.eql([value1, value2]);
    });
    it('should reflect metadata of all targets by decorator', () => {
      const decorator = Reflector.createDecorator<string>();
      const value1 = 'value1';
      const value2 = 'value2';
      Reflect.defineMetadata(decorator.KEY, value1, Test1);
      Reflect.defineMetadata(decorator.KEY, value2, Test2);

      // string[]
      const reflectedValue = reflector.getAll(decorator, [Test1, Test2]);
      expect(reflectedValue).to.eql([value1, value2]);

      reflectedValue satisfies string[];
    });
  });

  describe('getAllAndMerge', () => {
    it('should return an empty array when there are no targets', () => {
      expect(reflector.getAllAndMerge(key, [])).to.be.empty;
    });
    it('should reflect metadata of all targets and concat arrays', () => {
      const decorator = Reflector.createDecorator<string[]>();
      const value = 'value';
      Reflect.defineMetadata(decorator.KEY, [value], Test1);

      // string[]
      const reflectedValue = reflector.getAllAndMerge(decorator, [
        Test1,
        Test1,
      ]);
      expect(reflectedValue).to.eql([value, value]);

      reflectedValue satisfies string[];
    });
    it('should reflect metadata of all targets and concat boolean arrays', () => {
      const decorator = Reflector.createDecorator<boolean>();
      const value = true;
      Reflect.defineMetadata(decorator.KEY, [value], Test1);

      // string[]
      const reflectedValue = reflector.getAllAndMerge(decorator, [
        Test1,
        Test1,
      ]);
      expect(reflectedValue).to.eql([value, value]);

      reflectedValue satisfies boolean[];
    });
    it('should reflect metadata of all targets and create an array', () => {
      const decorator = Reflector.createDecorator<string>();
      const value = 'value';
      Reflect.defineMetadata(decorator.KEY, value, Test1);

      // string[]
      const reflectedValue = reflector.getAllAndMerge(decorator, [
        Test1,
        Test1,
      ]);
      expect(reflectedValue).to.eql([value, value]);

      reflectedValue satisfies string[];
    });
    it('should reflect metadata of all targets and merge objects', () => {
      const decorator = Reflector.createDecorator<TestObject>();
      const value1: TestObject = { only1: 'test1', both: 'overriden' };
      const value2: TestObject = { only2: 'test2', both: 'test' };
      Reflect.defineMetadata(decorator.KEY, value1, Test1);
      Reflect.defineMetadata(decorator.KEY, value2, Test2);

      // TestObject
      const reflectedValue = reflector.getAllAndMerge(decorator, [
        Test1,
        Test2,
      ]);
      expect(reflectedValue).to.eql({
        ...value1,
        ...value2,
      });

      reflectedValue satisfies TestObject;
    });
    it('should reflect metadata of all targets and create an array from a single value', () => {
      const value = 'value';
      Reflect.defineMetadata(key, value, Test1);

      const result = reflector.getAllAndMerge(key, [Test1, Test2]);
      expect(result).to.eql([value]);

      result satisfies string[];
    });
    it('should reflect metadata of all targets and return a single array unmodified', () => {
      const value = ['value'];
      Reflect.defineMetadata(key, value, Test1);
      expect(reflector.getAllAndMerge(key, [Test1, Test2])).to.eql(value);
    });
    it('should reflect metadata of all targets and return a single object unmodified', () => {
      const value = { test: 'value' };
      Reflect.defineMetadata(key, value, Test1);
      expect(reflector.getAllAndMerge(key, [Test1, Test2])).to.eql(value);
    });
  });

  describe('getAllAndOverride', () => {
    it('should reflect metadata of all targets and return a first not undefined value', () => {
      const value1 = 'value1';
      const value2 = 'value2';
      Reflect.defineMetadata(key, value1, Test1);
      Reflect.defineMetadata(key, value2, Test2);
      expect(reflector.getAllAndOverride(key, [Test1, Test2])).to.eql(value1);
    });
  });
});
