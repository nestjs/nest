import { WebSocketAdapter } from '@nestjs/common';

export interface INestMicroservice {
    listen(callback: () => void);
    useWebSocketAdapter(adapter: WebSocketAdapter): void;
    close(): void;
}