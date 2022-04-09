import { AxiosRequestConfig } from 'axios';
import { expect } from 'chai';
import { lastValueFrom } from 'rxjs';
import { HttpService } from '../../http/http.service';

describe('HttpService', () => {
  it('should not mutate user-given axios options object', done => {
    const http = new HttpService({ get: () => Promise.resolve() } as any);
    const options: AxiosRequestConfig = {};

    lastValueFrom(http.get('/', options)).then(() => {
      expect(options.cancelToken).to.be.undefined;
      done();
    });
  });
});
