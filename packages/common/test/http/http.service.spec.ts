import { expect } from 'chai';
import { HttpService } from '../../http/http.service';
import { AxiosRequestConfig, AxiosInstance } from 'axios';

describe('HttpService', () => {
  it('should not mutate user-given axios options object', done => {
    const http = new HttpService({ get: () => Promise.resolve() } as any);
    const options: AxiosRequestConfig = {};

    http
      .get('/', options)
      .toPromise()
      .then(() => {
        expect(options.cancelToken).to.be.undefined;
        done();
      });
  });
});
