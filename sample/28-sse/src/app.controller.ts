import { Controller, Get, MessageEvent, Sse } from '@nestjs/common';
import { AppService } from './app.service';
import { Observable, interval } from 'rxjs';
import { map } from 'rxjs/operators';

@Controller()
export class AppController {
  @Get()
  getHello(): string {
    return `
    <script type="text/javascript">
      const ee = new EventSource('/sse')
      ee.onmessage = ({data}) => {
        const message = document.createElement('li')
        message.innerText = 'New message: ' + data
        document.body.appendChild(message)
      }
    </script>
    `;
  }

  @Sse('/sse')
  sse(): Observable<MessageEvent> {
    return interval(1000).pipe(map((_) => ({ data: { hello: 'world' } })));
  }
}
