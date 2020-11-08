import { expect } from 'chai';
import { mock, SinonMock, spy } from 'sinon';
import got, {
  Got,
  GotPaginate,
  GotStream,
  HTTPError,
  OptionsOfJSONResponseBody,
  OptionsWithPagination,
} from 'got';
import { HttpService } from '../../http/http.service';
import { asapScheduler, Observable } from 'rxjs';
import { PaginateService } from '../../http/paginate.service';
import { Duplex } from 'stream';
import { StreamService } from '../../http/stream.service';
import { StreamRequest } from '../../http/stream.request';

describe('http services', () => {
  let gotInstance: Partial<Got> = {};
  let m: SinonMock;

  afterEach(() => {
    m.restore();
  });

  describe('HttpService', () => {
    let http: HttpService;
    let options: OptionsOfJSONResponseBody;

    beforeEach(() => {
      http = new HttpService(gotInstance as any, {} as any, {} as any);
      options = {};
    });

    ['get', 'head', 'post', 'put', 'patch', 'delete'].forEach(
      (key, index, methods) => {
        it(`${key}()`, complete => {
          const result = { body: {} };
          const mocked = Promise.resolve(result);
          (mocked as any).cancel = spy();
          gotInstance[key] = () => {};
          m = mock(gotInstance);
          m.expects(key).once().returns(mocked);

          const request = http[key]<Record<string, any>>(
            '/',
            options,
          ) as Observable<Record<string, any>>;

          request.subscribe({
            next(response) {
              expect(response).to.equal(result);
              expect(m.verify()).to.be.true;
            },
            complete,
          });
        });

        if (methods.length - 1 === index) {
          it('should check error reporting', () => {
            const result: any = { body: {}, statusCode: 500 };
            const mocked = Promise.reject(new HTTPError(result));

            (mocked as any).cancel = spy();

            m = mock(gotInstance);
            m.expects(key).returns(mocked);

            const request = http[key]('/', options, asapScheduler);

            request.subscribe({
              error(error) {
                expect(error).to.be.instanceOf(HTTPError);
                expect(m.verify()).to.be.true;
              },
            });
          });
        }
      },
    );
  });

  describe('PaginateService', () => {
    let paginate: PaginateService;
    let options: OptionsWithPagination;

    beforeEach(() => {
      paginate = new PaginateService(gotInstance as any);
      options = {};
    });

    it(`each()`, complete => {
      async function* asyncIterator() {
        const itemsCount = 10;

        for (let _ = 0; _ < itemsCount; _++) {
          yield { a: '' };
        }
      }

      (gotInstance.paginate as Partial<GotPaginate>) = {
        each: (() => {}) as any,
        all: spy(),
      };

      m = mock(gotInstance.paginate);
      m.expects('each').once().returns(asyncIterator());

      paginate.each('/', options, asapScheduler).subscribe({
        next(response) {
          expect(response).to.include({ a: '' });
          expect(m.verify()).to.be.true;
        },
        complete,
      });
    });

    it('all()', complete => {
      (gotInstance.paginate as Partial<GotPaginate>) = {
        each: spy(),
        all: (() => {}) as any,
      };

      const result = [1, 2, 3, 4];
      const mocked = Promise.resolve(result);

      m = mock(gotInstance.paginate);
      m.expects('all').once().returns(mocked);

      paginate.all('/', options, asapScheduler).subscribe({
        next(response) {
          expect(response).to.eql(result);
          expect(m.verify()).to.be.true;
        },
        complete,
      });
    });

    it('should check error reporting', done => {
      const result: any = { body: {}, statusCode: 500 };
      const mocked = Promise.reject(new HTTPError(result));

      (gotInstance.paginate as Partial<GotPaginate>) = {
        each: spy(),
        all: (() => {}) as any,
      };

      m = mock(gotInstance.paginate);
      m.expects('all').once().returns(mocked);

      paginate.all('/').subscribe({
        error(error) {
          expect(error).to.be.instanceOf(HTTPError);
          expect(m.verify()).to.be.true;
          done();
        },
      });
    });
  });

  describe('StreamService', () => {
    let stream: StreamService;
    let options: OptionsWithPagination;

    beforeEach(() => {
      stream = new StreamService(gotInstance as any, new StreamRequest());
      options = {};
    });

    ['get', 'head', 'post', 'put', 'patch', 'delete'].forEach(method => {
      it(`${method}()`, complete => {
        class CustomReadable extends Duplex {
          _read() {
            const str = '[1,2,3,4]';

            this.push(str);
            this.push(null);
          }
        }
        const readable = new CustomReadable();

        (gotInstance.stream as Partial<GotStream>) = {
          [method]: () => {},
        };

        m = mock(gotInstance.stream);
        m.expects(method).once().returns(readable);

        const request = stream[method]('/', options) as StreamRequest;

        request.on<Buffer>('data').subscribe({
          next(response) {
            expect(JSON.parse(response.toString())).to.eql([1, 2, 3, 4]);
          },
        });
        request.on('end').subscribe(complete);
      });
    });
  });
});
