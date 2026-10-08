import { Provider } from '../../../interfaces/index.js';
import { getInjectionProviders } from '../../../module-utils/utils/get-injection-providers.util.js';

describe('getInjectionProviders', () => {
  it('follows aliases through factories and optional dependencies', () => {
    const leaf = { provide: Symbol('leaf'), useValue: 'value' };
    const factory = {
      provide: 'factory',
      useFactory: value => value,
      inject: [{ token: leaf.provide, optional: true }],
    };
    const alias = { provide: 'alias', useExisting: 'factory' };
    const outer = { provide: 'outer', useExisting: 'alias' };
    const unused = { provide: 'unused', useValue: 'unused' };

    expect(
      getInjectionProviders([outer, alias, factory, leaf, unused], ['outer']),
    ).toEqual([outer, alias, factory, leaf]);
  });

  it('does not loop or duplicate providers through circular aliases', () => {
    const a = { provide: 'a', useExisting: 'b' };
    const b = { provide: 'b', useExisting: 'a' };
    expect(getInjectionProviders([a, b], ['a', 'a'])).toEqual([a, b]);
  });

  it('follows class tokens and empty-string alias targets', () => {
    class Target {}
    const classAlias = { provide: 'class', useExisting: Target };
    const emptyAlias = { provide: 'empty', useExisting: '' };
    const target = { provide: '', useValue: 'value' };
    expect(
      getInjectionProviders(
        [classAlias, Target, emptyAlias, target],
        ['class', 'empty'],
      ),
    ).toEqual([classAlias, emptyAlias, Target, target]);
  });

  it('should take only required providers', () => {
    class C {
      static token = 'anything';
    }
    class G {
      static token = 'anything';
      static optional = true;
    }
    class H {
      static token = 'anything';
      static optional = false;
    }
    const providers: Provider[] = [
      {
        //0
        provide: 'a',
        useValue: 'a',
      },
      {
        //1
        provide: 'b',
        useValue: 'b',
      },
      C, //2
      {
        //3
        provide: 'd',
        useFactory: (c, b) => [c, b],
        inject: [
          C,
          {
            token: 'b',
            optional: true,
          },
          'x',
          G,
          H,
        ],
      },
      {
        //4
        provide: 'e',
        useFactory: (d, b) => [d, b],
        inject: ['d', 'b'],
      },
      {
        //5
        provide: 'f',
        useValue: 'f',
      },
      G, //6
      H, //7
    ];

    const expected = [
      providers[1],
      providers[2],
      providers[3],
      providers[4],
      providers[6],
      providers[7],
    ];

    const result = getInjectionProviders(providers, ['e']);

    expect(result).toEqual(expect.arrayContaining(expected));
  });
});
