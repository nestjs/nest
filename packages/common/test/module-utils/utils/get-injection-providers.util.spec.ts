import { expect } from 'chai';
import { Provider } from '../../../interfaces';
import { getInjectionProviders } from '../../../module-utils/utils/get-injection-providers.util';

describe('getInjectionProviders', () => {
  it('should take only required providers', () => {
    class C {
      static token = 'a';
    }
    const p: Provider[] = [
      {
        provide: 'a',
        useValue: 'a',
      },
      {
        provide: 'b',
        useValue: 'b',
      },
      C,
      {
        provide: 'd',
        useFactory: (c, b) => [c, b],
        inject: [
          C,
          {
            token: 'b',
            optional: true,
          },
          'x',
        ],
      },
      {
        provide: 'e',
        useFactory: (d, b) => [d, b],
        inject: ['d', 'b'],
      },
      {
        provide: 'f',
        useValue: 'f',
      },
    ];
    // should not include 'a' and 'f'
    const expected = p.slice(1, -1);
    const result = getInjectionProviders(p, ['e']);
    expect(result).to.have.length(expected.length);
    expect(result).to.have.members(expected);
    expect(result).not.to.have.members([p[0], p[5]]);
  });
});
