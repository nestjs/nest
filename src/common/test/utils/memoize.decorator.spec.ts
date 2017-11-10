import { expect } from 'chai';
import { Memoize } from '../../utils/decorators/memoize.decorator';

describe('@Memoize', () => {
    class TestClass {
      @Memoize(5)
      getNumber(factor: number = 1): number {
        return Math.random() * factor;
      }
    }
    let testCase: TestClass;
    beforeEach(() => {
      testCase = new TestClass;
    });
    it('should memoizes the returned value', () => {
        expect(testCase.getNumber()).to.be.equal(testCase.getNumber());
    });

    it('should memoizes the returned value with same params', () => {
        expect(testCase.getNumber(5)).to.be.equal(testCase.getNumber(5));
    });

    it('should memoizes the returned value with different params', () => {
        expect(testCase.getNumber(2)).to.be.equal(testCase.getNumber(3));
    });

    it("clears the value automatically after timeout", (done) => {
    let testCase2 = testCase.getNumber();
    setTimeout(() => {
      expect(testCase.getNumber()).to.not.equal(testCase2);
      done();
    }, 6);
  });

});