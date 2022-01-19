import { v4 } from 'uuid';
import { Module } from './module';

const uuid = (function () {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@napi-rs/uuid').v4;
  } catch (e) {
    // for non-supported platforms, fallback to JavaScript implementation
    return v4;
  }
})();

export class ModulesContainer extends Map<string, Module> {
  private readonly _applicationId = uuid();

  get applicationId(): string {
    return this._applicationId;
  }
}
