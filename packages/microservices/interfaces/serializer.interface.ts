import {
  OutgoingEvent,
  OutgoingRequest,
  OutgoingResponse,
} from './packet.interface';

export interface Serializer<TInput = any, TOutput = any> {
  serialize(value: TInput): TOutput;
}

export type ProducerSerializer = Serializer<
  OutgoingEvent | OutgoingRequest,
  any
>;
export type ConsumerSerializer = Serializer<OutgoingResponse, any>;
