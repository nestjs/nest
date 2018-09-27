import { Type } from '@nest/core';

export const getRepositoryToken = (collection: Type<any>) =>
  Symbol.for(`Repository<${collection.name}>`);
