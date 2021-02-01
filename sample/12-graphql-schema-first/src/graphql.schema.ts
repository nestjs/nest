/** ------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
export abstract class CreateCatInput {
  name?: string;
  age?: number;
}

export abstract class Cat {
  id?: number;
  name?: string;
  age?: number;
}

export abstract class Owner {
  id?: number;
  name?: string;
  age?: number;
}

export abstract class IMutation {
  abstract createCat(createCatInput?: CreateCatInput): Cat | Promise<Cat>;
}

export abstract class IQuery {
  abstract getCats(): Cat[] | Promise<Cat[]>;

  abstract cat(id: string): Cat | Promise<Cat>;

  abstract temp__(): boolean | Promise<boolean>;
}

export abstract class ISubscription {
  abstract catCreated(): Cat | Promise<Cat>;
}
