import { MergeWithValues } from '../../utils/merge-with-values.util.js';

describe('MergeWithValues', () => {
  let type;
  const data = { test: [1, 2, 3] };
  class Test {}

  beforeEach(() => {
    type = MergeWithValues(data)(Test);
  });
  it('should enrich prototype with given values', () => {
    expect(type.prototype).toMatchObject(data);
  });
  it('should set name of metatype', () => {
    expect(type.name).toBe(Test.name + JSON.stringify(data));
  });
});
