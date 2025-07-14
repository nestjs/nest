import { Observable, ReplaySubject } from 'rxjs';
import { uid } from 'uid';
import { Module } from './module';

export class ModulesContainer extends Map<string, Module> {
  private readonly _applicationId = uid(21);
  private readonly _rpcTargetRegistry$ = new ReplaySubject<any>();

  /**
   * Unique identifier of the application instance.
   */
  get applicationId(): string {
    return this._applicationId;
  }

  /**
   * Retrieves a module by its identifier.
   * @param id The identifier of the module to retrieve.
   * @returns The module instance if found, otherwise undefined.
   */
  public getById(id: string): Module | undefined {
    return Array.from(this.values()).find(moduleRef => moduleRef.id === id);
  }

  /**
   * Returns the RPC target registry as an observable.
   * This registry contains all RPC targets registered in the application.
   * @returns An observable that emits the RPC target registry.
   */
  public getRpcTargetRegistry<T>(): Observable<T> {
    return this._rpcTargetRegistry$.asObservable();
  }

  /**
   * Adds an RPC target to the registry.
   * @param target The RPC target to add.
   */
  public addRpcTarget<T>(target: T): void {
    this._rpcTargetRegistry$.next(target);
  }
}
