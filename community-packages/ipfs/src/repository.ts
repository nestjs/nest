import { Type } from '@nest/core';
import { ClassType, transformAndValidate } from 'class-transformer-validator';

export class Repository<C extends object> {
  constructor(
    private readonly ipfs: any,
    private readonly collection: Type<C>,
  ) {}

  public async save(...collections: C[]) {
    const collection = await transformAndValidate(
      <ClassType<C>>this.collection,
      collections,
    );
  }
}
