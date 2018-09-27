import { Injectable } from '@nest/core';

import { MetadataStorage } from '../metadata-storage';

export function Controller(path: string): ClassDecorator {
  return (target: object) => {
    MetadataStorage.controllers.add({
      target,
      path,
    });

    Injectable()(target);
  };
}
