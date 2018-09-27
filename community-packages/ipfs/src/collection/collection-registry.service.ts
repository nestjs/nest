import { Injectable, Type, ValueProvider } from '@nest/core';

import { getRepositoryToken } from '../get-repository-token';
import { Repository } from '../repository';

@Injectable()
export class CollectionRegistry {
  /*@Inject(MODULE_REF)
  private readonly module!: ModuleRef;*/

  /*@Inject(IPFS_CLIENT)
  private readonly ipfs: any;*/

  public static getTokens(providers: ValueProvider<Repository>[]) {
    return providers.map(provider => provider.provide);
  }

  public static create(collections: Type<any>[]): ValueProvider<Repository>[] {
    return collections.map(collection => {
      const token = getRepositoryToken(collection);
      const repo = new Repository({}, collection);

      return {
        provide: token,
        useValue: repo,
      };
    });
  }
}
