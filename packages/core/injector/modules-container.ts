import { v4 as uuid } from 'uuid';
import { Module } from './module';

export class ModulesContainer extends Map<string, Module> {
  private readonly _applicationId = uuid();

  get applicationId(): string {
    return this._applicationId;
  }
}
