import { expect } from 'chai';
import { MsvcUtil } from '../../utils/msvc.util';

describe('MsvcUtil', () => {

  describe('transformPatternToRoute', () => {
    it(`use 'string' value`, () => {
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

    it(`use 'JSON' value without nested JSON (1 level)`, () => {
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

    it(`use 'JSON' value with nested JSON (2 levels)`, () => {
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

    it(`use 'JSON' value with nested JSON (3 levels)`, () => {
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

    it(`throw error if pattern has an incorrect type (no string/JSON)`, () => {
      const testPattern1 = 150;
      const testPattern2 = null;
      const testPattern3 = undefined;
      const testPattern4 = Symbol(213);
      const errMsg = `The pattern must be of type 'string' or 'object'!`;

      expect(MsvcUtil.transformPatternToRoute.bind(null, testPattern1)).to.throw(errMsg);
      expect(MsvcUtil.transformPatternToRoute.bind(null, testPattern2)).to.throw(errMsg);
      expect(MsvcUtil.transformPatternToRoute.bind(null, testPattern3)).to.throw(errMsg);
      expect(MsvcUtil.transformPatternToRoute.bind(null, testPattern4)).to.throw(errMsg);
    });
  });
});
