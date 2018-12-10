import { HttpServer } from '@nestjs/common';

export class ApplicationReferenceHost<T extends HttpServer = any> {
  private _applicationRef: T;

  set applicationRef(applicationRef: T) {
    this._applicationRef = applicationRef;
  }

  get applicationRef(): T | undefined {
    return this._applicationRef;
  }
}
