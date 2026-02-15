import { createContextId } from '../../helpers/context-id-factory.js';

describe('createContextId', () => {
  it('should return an object with random "id" property', () => {
    expect(createContextId()).toHaveProperty('id');
  });
});
