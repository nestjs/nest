import { Injectable } from '@nest/core';
import { Observable, of } from 'rxjs';
import { Provide, RpcResponseError, RpcResponseReject } from '@nest/ds-client';

export interface UserCredentials {
  username: string;
  password: string;
}

@Injectable()
export class UserRpcService {
  @Provide('login')
  onLogin({
    username,
    password,
  }: UserCredentials): Observable<UserCredentials> {
    if (username === 'Test') {
      throw new RpcResponseError('Incorrect username');
    } else if (password === '') {
      throw new RpcResponseReject();
    }

    return of({ username, password });
  }
}
