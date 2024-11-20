import { expect } from 'chai';
import { Provider } from '../../../interfaces';
import { getInjectionProviders } from '../../../module-utils/utils/get-injection-providers.util';

describe('getInjectionProviders', () => {
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

    expect(result).to.have.members(expected);
  });
});
