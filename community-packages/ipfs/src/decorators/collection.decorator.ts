import { Injectable, Reflector, Type } from '@nest/core';
import paramCase = require('param-case');

import { CollectionOptions } from '../interfaces';
import {
  COLLECTION_NAME_METADATA,
  COLLECTION_REPO_METADATA,
  // COLLECTION_EMBEDDED_METADATA,
} from '../metadata';

export function Collection(options: CollectionOptions = {}) {
  return (target: Type<any>) => {
    const collectionName = paramCase(options.name || target.name);

    Reflector.defineByKeys(
      {
        [COLLECTION_NAME_METADATA]: collectionName,
        [COLLECTION_REPO_METADATA]: options.repo,
        // [COLLECTION_EMBEDDED_METADATA]: options.embedded,
      },
      [],
      target,
    );

    return Injectable()(target);
  };
}
