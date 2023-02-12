import {
  OutgoingEvent,
  OutgoingRequest,
  OutgoingResponse,
} from './packet.interface';

/**
 * @publicApi
 */
export interface Serializer<TInput = any, TOutput = any> {
  serialize(value: TInput, options?: Record<string, any>): TOutput;
}

export type ProducerSerializer = Serializer<
  OutgoingEvent | OutgoingRequest,
  any
>;
export type ConsumerSerializer = Serializer<OutgoingResponse, any>;
