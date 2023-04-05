/**
 * @publicApi
 */
export type RawBodyRequest<T> = T & { rawBody?: Buffer };
