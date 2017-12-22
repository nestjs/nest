import * as sinon from 'sinon';
import { expect } from 'chai';
import { PipesContextCreator } from './../../pipes/pipes-context-creator';

describe('PipesContextCreator', () => {
  let creator: PipesContextCreator;
  beforeEach(() => {
    creator = new PipesContextCreator(null);
  });
  describe('createConcreteContext', () => {
    describe('when metadata is empty or undefined', () => {
      it('should returns empty array', () => {
        expect(creator.createConcreteContext(undefined)).to.be.deep.equal([]);
        expect(creator.createConcreteContext([])).to.be.deep.equal([]);
      });
    });
    describe('when metadata is not empty or undefined', () => {
      const metadata = [null, {}, { transform: () => ({}) }];
      it('should returns expected array', () => {
        const transforms = creator.createConcreteContext(metadata as any);
        expect(transforms).to.have.length(1);
      });
    });
  });
});
