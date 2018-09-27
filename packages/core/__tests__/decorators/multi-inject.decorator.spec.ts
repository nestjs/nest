import 'reflect-metadata';
import {
  Injectable,
  InjectionToken,
  MissingInjectionTokenMessage,
  MultiInject,
} from '@nest/core';
import { Test } from '@nest/testing';

describe('@MultiInject()', () => {
  it('should multi inject providers', async () => {
    interface Weapon {
      name: string;
    }

    const WEAPON = new InjectionToken<Weapon>('WEAPON');

    @Injectable()
    class Katana implements Weapon {
      name = 'Katana';
    }

    @Injectable()
    class Shuriken implements Weapon {
      name = 'Shuriken';
    }

    @Injectable()
    class Ninja {
      readonly katana: Katana;
      readonly shuriken: Shuriken;

      constructor(@MultiInject(WEAPON) weapons: Weapon[]) {
        this.katana = weapons[0];
        this.shuriken = weapons[1];
      }
    }

    const test = await Test.createTestingModule({
      providers: [
        {
          provide: WEAPON,
          useClass: Katana,
          multi: true,
        },
        {
          provide: WEAPON,
          useClass: Shuriken,
          multi: true,
        },
        Ninja,
      ],
    }).compile();

    const weapons = test.getAll<Weapon>(WEAPON);
    const ninja = test.get<Ninja>(Ninja);

    expect(weapons).toHaveLength(2);

    expect(weapons[0]).toBeInstanceOf(Katana);
    expect(weapons[1]).toBeInstanceOf(Shuriken);

    expect(ninja.katana).toBeInstanceOf(Katana);
    expect(ninja.shuriken).toBeInstanceOf(Shuriken);
  });

  it('should throw error when not using an injection token', () => {
    const message = MissingInjectionTokenMessage('@MultiInject()');

    expect(() => {
      interface Weapon {}
      class Ninja implements Weapon {}

      class Test {
        constructor(@MultiInject(Ninja) weapons: Weapon[]) {}
      }
    }).toThrow(message);
  });
});
