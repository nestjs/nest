import { Controller, Get, MessageEvent, Sse } from '@nestjs/common';
import { interval, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Controller()
export class AppController {
  @Get()
  index(): string {
    return `
      <script type="text/javascript">
        const eventSource = new EventSource('/sse');
        eventSource.onmessage = ({ data }) => {
          const message = document.createElement('li');
          message.innerText = 'New message: ' + data;
          document.body.appendChild(message);
        }
      </script>
    `;
  }

  @Sse('sse')
  sse(): Observable<MessageEvent> {
    return interval(1000).pipe(map((_) => ({ data: { hello: 'world' } })));
  }
}
