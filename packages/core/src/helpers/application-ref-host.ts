import { HttpServer } from '@nestjs/common';

export class ApplicationReferenceHost {
  private _applicationRef: HttpServer | any;

  set applicationRef(applicationRef: any) {
    this._applicationRef = applicationRef;
  }

  get applicationRef(): HttpServer | any {
    return this._applicationRef;
  }
}
