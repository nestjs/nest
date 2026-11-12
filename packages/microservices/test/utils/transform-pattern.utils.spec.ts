import { MsPattern } from '../../interfaces/index.js';
import {
  exceedsPatternLimits,
  transformPatternToRoute,
} from '../../utils/transform-pattern.utils.js';

function equalTest<R>(testPatterns: MsPattern[], expectedResults: R[]) {
  testPatterns.forEach((testPattern: MsPattern, index: number) => {
    const testData = transformPatternToRoute(testPattern);
    expect(testData).toBe(expectedResults[index]);
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
        ] as MsPattern[];

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
        ] as MsPattern[];

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
        ] as MsPattern[];

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
        expect(transformPatternToRoute(testPattern)).toBe(testPattern);
      });
    });
  });

  describe('when gets value exceeding max depth or max keys', () => {
    it('should return special string indicating the limit was reached', () => {
      const deepNestedPattern = {
        a: { b: { c: { d: { e: { f: { g: 'too deep' } } } } } },
      };
      const tooManyKeysPattern = Object.fromEntries(
        Array.from({ length: 25 }, (_, i) => [`key${i}`, `value${i}`]),
      );

      expect(transformPatternToRoute(deepNestedPattern)).toBe(
        '{"a":{"b":{"c":{"d":{"e":{"f":[MAX_DEPTH_REACHED]}}}}}}',
      );
      expect(transformPatternToRoute(tooManyKeysPattern)).toBe(
        '[TOO_MANY_KEYS]',
      );
    });
  });

  describe('when gets a key exceeding max key length', () => {
    // Keys are sorted with localeCompare, which can take time quadratic in
    // their length (e.g., for keys made of many combining marks)
    const longestKey = 'k'.repeat(256);

    it('should return special string indicating the limit was reached', () => {
      expect(transformPatternToRoute({ [`${longestKey}k`]: 'value' })).toBe(
        '[KEY_TOO_LONG]',
      );
      expect(
        transformPatternToRoute({ cmd: { [`${longestKey}k`]: 'value' } }),
      ).toBe('{"cmd":[KEY_TOO_LONG]}');
    });
    it('should return correct route for a key of max key length', () => {
      expect(transformPatternToRoute({ [longestKey]: 'value' })).toBe(
        `{"${longestKey}":"value"}`,
      );
    });
  });

  describe('when gets an array with more items than max keys', () => {
    it('should return special string without listing its items', () => {
      const items = Array(21).fill(0);
      const objectKeys = vi.spyOn(Object, 'keys');

      expect(transformPatternToRoute({ cmd: items })).toBe(
        '{"cmd":[TOO_MANY_KEYS]}',
      );
      expect(objectKeys).not.toHaveBeenCalledWith(items);
      objectKeys.mockRestore();
    });
    it('should return correct route for an array of max keys', () => {
      expect(transformPatternToRoute({ cmd: [1, 2] })).toBe(
        '{"cmd":{"0":1,"1":2}}',
      );
    });
  });

  describe('when gets a string value exceeding max value length', () => {
    const longestValue = 'v'.repeat(4096);

    it('should return special string indicating the limit was reached', () => {
      expect(transformPatternToRoute({ cmd: `${longestValue}v` })).toBe(
        '{"cmd":[VALUE_TOO_LONG]}',
      );
    });
    it('should return correct route for a value of max value length', () => {
      expect(transformPatternToRoute({ cmd: longestValue })).toBe(
        `{"cmd":"${longestValue}"}`,
      );
    });
  });

  describe('when the whole pattern has more keys than max total keys', () => {
    // Each object is within the limits, but there are 5 + 5 * 20 keys
    const objectOfKeys = (count: number) =>
      Object.fromEntries(
        Array.from({ length: count }, (_, i) => [`key${i}`, i]),
      );
    const patternOfKeys = (objects: number, keysEach: number) =>
      Object.fromEntries(
        Array.from({ length: objects }, (_, i) => [
          `object${i}`,
          objectOfKeys(keysEach),
        ]),
      );

    it('should return special string indicating the limit was reached', () => {
      expect(transformPatternToRoute(patternOfKeys(5, 20))).toBe(
        '[TOO_MANY_KEYS]',
      );
    });
    it('should return correct route for a pattern of max total keys', () => {
      const route = transformPatternToRoute(patternOfKeys(5, 19));
      expect(route).toMatch(/^\{"object0":\{"key0":0,"key1":1,"key10":10,/);
      expect(route).not.toContain('[');
    });
  });
});

describe('exceedsPatternLimits', () => {
  it('should return false for a pattern within the limits', () => {
    for (const pattern of [
      'sum',
      42,
      { cmd: 'sum' },
      { cmd: { role: 'user', ids: [1, 2] } },
      { cmd: 'v'.repeat(4096) },
    ]) {
      expect(exceedsPatternLimits(pattern)).toBe(false);
    }
  });
  it('should not apply the value length limit to a string pattern', () => {
    expect(exceedsPatternLimits('v'.repeat(5000))).toBe(false);
  });
  it.each([
    ['too deep', { a: { b: { c: { d: { e: { f: { g: 1 } } } } } } }],
    [
      'too many keys',
      Object.fromEntries(Array.from({ length: 21 }, (_, i) => [`k${i}`, i])),
    ],
    ['a key too long', { cmd: { ['k'.repeat(257)]: 1 } }],
    ['a value too long', { cmd: 'v'.repeat(4097) }],
    ['an array too long', { cmd: Array(10_000).fill({}) }],
    [
      'too many keys in total',
      Object.fromEntries(
        Array.from({ length: 6 }, (_, i) => [
          `o${i}`,
          Object.fromEntries(
            Array.from({ length: 20 }, (_, j) => [`k${j}`, j]),
          ),
        ]),
      ),
    ],
  ])('should return true for a pattern with %s', (_, pattern) => {
    expect(exceedsPatternLimits(pattern)).toBe(true);
    // Its route says so as well
    expect(transformPatternToRoute(pattern as MsPattern)).toMatch(
      /\[(MAX_DEPTH_REACHED|TOO_MANY_KEYS|KEY_TOO_LONG|VALUE_TOO_LONG)\]/,
    );
  });
});

describe('transformPatternToRoute key order', () => {
  it('should keep the order of keys of ASCII characters', () => {
    const keys = ['userid', 'userZip', 'B', 'a', 'service_id', 'serviceName'];
    const pattern = Object.fromEntries(keys.map((key, i) => [key, i]));
    const route = keys
      .slice()
      .sort((x, y) => x.localeCompare(y))
      .map(key => `"${key}":${keys.indexOf(key)}`)
      .join(',');

    expect(transformPatternToRoute(pattern)).toBe(`{${route}}`);
  });

  it('should put keys of other characters after them, in code unit order', () => {
    expect(transformPatternToRoute({ ä: 1, z: 2, é: 3, a: 4 })).toBe(
      '{"a":4,"z":2,"ä":1,"é":3}',
    );
  });

  it('should not compare keys of other characters with localeCompare', () => {
    // Combining marks on one letter make each comparison slow
    const marks = '\u0344'.repeat(60) + '\u0F71'.repeat(191);
    // So does a letter with no mark of its own whose decomposition has two
    const decomposing = '\uFB2C'.repeat(100);
    const pattern = Object.fromEntries([
      ...['aaaaa', 'aaaaA', 'aaaAa', 'aaAaa'].map(prefix => [
        prefix + marks,
        0,
      ]),
      [decomposing + 'a', 0],
      [decomposing + 'b', 0],
      ['cmd', 'x'],
      ['id', 1],
    ]);
    const localeCompare = vi.spyOn(String.prototype, 'localeCompare');

    transformPatternToRoute(pattern);

    const isAscii = (value: unknown) => !/[\u0080-\uffff]/.test(String(value));
    expect(localeCompare).toHaveBeenCalled();
    expect(localeCompare.mock.calls.every(([other]) => isAscii(other))).toBe(
      true,
    );
    expect(localeCompare.mock.contexts.every(isAscii)).toBe(true);
    localeCompare.mockRestore();
  });
});
