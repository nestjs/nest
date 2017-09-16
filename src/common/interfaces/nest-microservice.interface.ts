import { WebSocketAdapter } from '@nestjs/common';

export interface INestMicroservice {
    /**
     * Starts the microservice.
     *
     * @param  {Function} callback Callback called after instant
     * @returns Promise
     */
    listen(callback: () => void);

    /**
     * Setup Web Sockets Adapter, which will be used inside Gateways.
     * Use, when you want to override default `socket.io` library.
     *
     * @param  {WebSocketAdapter} adapter
     * @returns void
     */
    useWebSocketAdapter(adapter: WebSocketAdapter): void;

    /**
     * Terminates the application (both NestMicroservice and every Web Socket Gateway)
     *
     * @returns void
     */
    close(): void;
}