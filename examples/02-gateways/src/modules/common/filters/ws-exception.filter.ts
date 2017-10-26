import { WsException } from '@nestjs/websockets';
import { Catch, WsExceptionFilter } from '';

@Catch(WsException)
export class ExceptionFilter implements WsExceptionFilter {
  catch(exception: WsException, client) {
    client.emit('exception', {
      status: 'error',
      message: `It's a message from the exception filter`,
    });
  }
}
