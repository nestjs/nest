import { expect } from 'chai';
import { Reflector } from '../../services/reflector.service';

describe('Reflector', () => {
  let reflector: Reflector;
  class Test {}
  beforeEach(() => {
    reflector = new Reflector();
  });
  describe('get', () => {
    it('should reflect metadata', () => {
      const key = 'key';
      const value = 'value';
      Reflect.defineMetadata(key, value, Test);
      expect(reflector.get(key, Test)).to.eql(value);
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
});
