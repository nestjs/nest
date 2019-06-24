import * as Interfaces from './../../interfaces';
import { expect } from 'chai';
import { MsvcUtil } from '../../utils/msvc.util';

function equalTest<R>(testPatterns: Interfaces.MsPattern[], expectedResults: R[]) {
  testPatterns.forEach((testPattern: Interfaces.MsPattern, index: number) => {
    const testData = MsvcUtil.transformPatternToRoute(testPattern);
    expect(testData).to.be.equal(expectedResults[index]);
  });
}

describe('MsvcUtil', () => {

  describe('transformPatternToRoute', () => {
    describe(`when gets 'number' value`, () => {
      it(`should return the 'number' what is wrapped in a string`, () => {
        const testPatterns = [
          1, 150, 12345,
        ];
        const expectedResults = [
          `1`, `150`, `12345`,
        ];

        equalTest(testPatterns, expectedResults);
      });
    });

    describe(`gets 'string' value`, () => {
      it(`should return the same string`, () => {
        const testPattern1 = `pattern1`;
        const testPattern2 = 'PaTteRn2';
        const testPattern3 = '3PaTteRn';

        const testData1 = MsvcUtil.transformPatternToRoute(testPattern1);
        const testData2 = MsvcUtil.transformPatternToRoute(testPattern2);
        const testData3 = MsvcUtil.transformPatternToRoute(testPattern3);

        expect(testData1).to.be.equal(testPattern1);
        expect(testData2).to.be.equal(testPattern2);
        expect(testData3).to.be.equal(testPattern3);
      });
    });

    describe(`gets 'JSON' value`, () => {
      describe(`without nested JSON (1 level)`, () => {
        it(`should return correct route`, () => {
          const testPattern1 = {
            controller: 'app',
            use: 'getHello'
          };
          const testPattern2 = {
            use: 'getHello',
            controller: 'app'
          };
          const testPattern3 = {
            service: 'one',
            use: 'getHello',
            controller: 'app'
          };

          const testData1 = MsvcUtil.transformPatternToRoute(testPattern1);
          const testData2 = MsvcUtil.transformPatternToRoute(testPattern2);
          const testData3 = MsvcUtil.transformPatternToRoute(testPattern3);

          expect(testData1).to.be.equal(`{controller:app/use:getHello}`);
          expect(testData2).to.be.equal(`{controller:app/use:getHello}`);
          expect(testData3).to.be.equal(`{controller:app/service:one/use:getHello}`);
        });
      });
      describe(`use 'JSON' value with nested JSON (2 levels)`, () => {
        it(`should return correct route`, () => {
          const testPattern1 = {
            controller: 'app',
            use: { p1: 'path1', p2: 'path2' }
          };
          const testPattern2 = {
            use: { p1: 'path1', p2: 'path2' },
            controller: 'app'
          };
          const testPattern3 = {
            service: 'one',
            use: { p1: 'path1', p2: 'path2' },
            controller: 'app'
          };

          const testData1 = MsvcUtil.transformPatternToRoute(testPattern1);
          const testData2 = MsvcUtil.transformPatternToRoute(testPattern2);
          const testData3 = MsvcUtil.transformPatternToRoute(testPattern3);

          expect(testData1).to.be.equal(`{controller:app/use:{p1:path1/p2:path2}}`);
          expect(testData2).to.be.equal(`{controller:app/use:{p1:path1/p2:path2}}`);
          expect(testData3).to.be.equal(`{controller:app/service:one/use:{p1:path1/p2:path2}}`);
        });
      });
      describe(`use 'JSON' value with nested JSON (3 levels)`, () => {
        it(`should return correct route`, () => {
          const testPattern1 = {
            controller: 'app',
            use: { p1: 'path1', p2: { pp1: 'ppath1' } }
          };
          const testPattern2 = {
            use: { p1: 'path1' },
            controller: { p2: 'path2' },
          };
          const testPattern3 = {
            service: 'one',
            use: { p1: 'path1', p2: { pp1: 'ppath1' } },
            controller: { p1: { pp1: 'ppath1' } }
          };

          const testData1 = MsvcUtil.transformPatternToRoute(testPattern1);
          const testData2 = MsvcUtil.transformPatternToRoute(testPattern2);
          const testData3 = MsvcUtil.transformPatternToRoute(testPattern3);

          expect(testData1)
            .to.be.equal(`{controller:app/use:{p1:path1/p2:{pp1:ppath1}}}`);
          expect(testData2)
            .to.be.equal(`{controller:{p2:path2}/use:{p1:path1}}`);
          expect(testData3)
            .to.be.equal(`{controller:{p1:{pp1:ppath1}}/service:one/use:{p1:path1/p2:{pp1:ppath1}}}`);
        });
      });
    });

    describe(`when gets value with incorrect type (no string/number/JSON)`, () => {
      it(`should throw error`, () => {
        const testPatterns = [
          null,
          undefined,
          Symbol(213),
        ];
        const errMsg = `The pattern must be of type 'string' or 'object'!`;

        testPatterns.forEach((testPattern: any) => {
          expect(MsvcUtil.transformPatternToRoute.bind(null, testPattern)).to.throw(errMsg);
        });
      });
    });
  });
});
