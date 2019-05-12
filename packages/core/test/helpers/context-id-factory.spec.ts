import { expect } from 'chai';
import { createContextId } from '../../helpers/context-id-factory';

describe('createContextId', () => {
  it('should return an object with random "id" property', () => {
    expect(createContextId()).to.have.property('id');
  });
});
