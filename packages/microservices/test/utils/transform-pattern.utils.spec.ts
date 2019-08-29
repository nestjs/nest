import { expect } from 'chai';
import { MsPattern } from '../../interfaces';
import { transformPatternToRoute } from '../../utils/transform-pattern.utils';

function equalTest<R>(testPatterns: MsPattern[], expectedResults: R[]) {
  testPatterns.forEach((testPattern: MsPattern, index: number) => {
    const testData = transformPatternToRoute(testPattern);
    expect(testData).to.be.equal(expectedResults[index]);
  });
}
describe('transformPatternToRoute', () => {
  describe(`when gets 'number' value`, () => {
    it(`should return the 'number' what is wrapped in a string`, () => {
      const testPatterns = [1, 150, 12345];
      const expectedResults = [`1`, `150`, `12345`];

      equalTest(testPatterns, expectedResults);
    });
  });

  describe(`when gets 'string' value`, () => {
    it(`should return the same string`, () => {
      const testPatterns = [`pattern1`, 'PaTteRn2', '3PaTteRn'];

      equalTest(testPatterns, testPatterns);
    });
  });

  describe(`when gets 'JSON' value`, () => {
    describe(`without nested JSON (1 level)`, () => {
      it(`should return correct route`, () => {
        const testPatterns = [
          {
            controller: 'app',
            use: 'getHello',
          },
          {
            use: 'getHello',
            controller: 'app',
          },
          {
            service: 'one',
            use: 'getHello',
            controller: 'app',
            id: 150,
          },
        ];

        const expectedResults = [
          JSON.stringify(testPatterns[0]),
          `{"controller":"app","use":"getHello"}`,
          `{"controller":"app","id":150,"service":"one","use":"getHello"}`,
        ];

        equalTest(testPatterns, expectedResults);
      });
    });
    describe(`with nested JSON (2 levels)`, () => {
      it(`should return correct route`, () => {
        const testPatterns = [
          {
            controller: 'app',
            use: { p1: 'path1', p2: 'path2', p3: 10 },
          },
          {
            use: { p1: 'path1', p2: 'path2' },
            controller: 'app',
          },
          {
            service: 'one',
            use: { p1: 'path1', p2: 'path2', id: 160 },
            controller: 'app',
          },
        ];

        const expectedResults = [
          JSON.stringify(testPatterns[0]),
          `{"controller":"app","use":{"p1":"path1","p2":"path2"}}`,
          `{"controller":"app","service":"one","use":{"id":160,"p1":"path1","p2":"path2"}}`,
        ];

        equalTest(testPatterns, expectedResults);
      });
    });
    describe(`with nested JSON (3 levels)`, () => {
      it(`should return correct route`, () => {
        const testPatterns = [
          {
            controller: 'app',
            use: { p1: 'path1', p2: { pp1: 'ppath1' } },
          },
          {
            use: { p1: 'path1' },
            controller: { p2: 'path2' },
          },
          {
            service: 'one',
            use: { p1: 'path1', p2: { pp1: 'ppath1' } },
            controller: { p1: { pp1: 'ppath1', id: 180 } },
          },
        ];

        const expectedResults = [
          JSON.stringify(testPatterns[0]),
          `{"controller":{"p2":"path2"},"use":{"p1":"path1"}}`,
          `{"controller":{"p1":{"id":180,"pp1":"ppath1"}},"service":"one","use":{"p1":"path1","p2":{"pp1":"ppath1"}}}`,
        ];

        equalTest(testPatterns, expectedResults);
      });
    });
  });

  describe(`when gets value with incorrect type (no string/number/JSON)`, () => {
    it(`should return the value unchanged`, () => {
      const testPatterns = [null, undefined, Symbol(213)];

      testPatterns.forEach((testPattern: any) => {
        expect(transformPatternToRoute(testPattern)).to.be.eq(testPattern);
      });
    });
  });
});
