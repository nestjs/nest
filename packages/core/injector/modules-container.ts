import { uid } from 'uid';
import { Module } from './module';

export class ModulesContainer extends Map<string, Module> {
  private readonly _applicationId = uid(21);

  get applicationId(): string {
    return this._applicationId;
  }

  public getById(id: string): Module | undefined {
    return Array.from(this.values()).find(moduleRef => moduleRef.id === id);
  }
}
