import { METHOD_METADATA, PATH_METADATA, REDIRECT_METADATA, ROUTE_ARGS_METADATA } from '../../constants';
import { RequestMethod } from '../../enums';
import { RouteParamtypes } from '../../enums/route-paramtypes.enum';
import { Observable, Subject } from 'rxjs';

export interface SSEMessage<T> {
  id?: string;
  data: string;
  event?: T
}

export function ServerSentEvent<T>(path: string, retry: number = 2000): MethodDecorator {
  return <Type>(target, propertyKey, descriptor) => {

    const oldFunction = descriptor.value;

    function newFunction(req: Request, res: Response) {
      req.socket.setKeepAlive(true);
      req.socket.setTimeout(0);
      const lastEventId = req.header('last-event-id');

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.status(200);
      const subject = new Subject<SSEMessage<T>>();
      res.write(`retry: ${retry}\n\n`);
      const stopSubject = subject.subscribe((messageData) => {
        const {id, event, data} = messageData;
        const message = Object.entries({id, event, data})
          .filter(([, value]) => ![undefined, null].includes(value))
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n') + '\n\n';

        res.write(message);
      });

      const observableFromController: Observable<any> = oldFunction.call(target.constructor, subject, lastEventId);

      let unSubscribeObservableFromController;
      if (observableFromController && observableFromController.subscribe) {
        unSubscribeObservableFromController = observableFromController.subscribe((data) => subject.next(data));
      }

      res.on('close', () => {
        stopSubject.unsubscribe();
        if (unSubscribeObservableFromController) {
          unSubscribeObservableFromController.unsubscribe();
        }
      });

    }

    descriptor.value = newFunction;

    Reflect.defineMetadata(PATH_METADATA, path, descriptor.value);
    Reflect.defineMetadata(METHOD_METADATA, RequestMethod.GET, descriptor.value);
    const metaData = {
      [`${RouteParamtypes.REQUEST}:0`]: { index: 0, data: undefined, pipe: [] },
      [`${RouteParamtypes.RESPONSE}:1`]: { index: 1, data: undefined, pipe: [] }
    };

    Reflect.defineMetadata(ROUTE_ARGS_METADATA, metaData, target.constructor, propertyKey);
    return descriptor;
    return descriptor;
  };
}
