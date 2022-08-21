/*
 * -------------------------------------------------------
 * THIS FILE WAS AUTOMATICALLY GENERATED (DO NOT MODIFY)
 * -------------------------------------------------------
 */

/* tslint:disable */
/* eslint-disable */
export class CreateCatInput {
  name?: Nullable<string>;
  age?: Nullable<number>;
}

export abstract class IQuery {
  abstract cats():
    | Nullable<Nullable<Cat>[]>
    | Promise<Nullable<Nullable<Cat>[]>>;

  abstract cat(id: string): Nullable<Cat> | Promise<Nullable<Cat>>;
}

export abstract class IMutation {
  abstract createCat(
    createCatInput?: Nullable<CreateCatInput>,
  ): Nullable<Cat> | Promise<Nullable<Cat>>;
}

export abstract class ISubscription {
  abstract catCreated(): Nullable<Cat> | Promise<Nullable<Cat>>;
}

export class Owner {
  id: number;
  name: string;
  age?: Nullable<number>;
  cats?: Nullable<Cat[]>;
}

export class Cat {
  id?: Nullable<number>;
  name?: Nullable<string>;
  age?: Nullable<number>;
  owner?: Nullable<Owner>;
}

type Nullable<T> = T | null;
