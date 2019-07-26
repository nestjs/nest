import { IncomingRequest, IncomingResponse } from './packet.interface';

export interface Deserializer<TInput = any, TOutput = any> {
  deserialize(value: TInput): TOutput;
}

export type ProducerDeserializer = Deserializer<any, IncomingResponse>;
export type ConsumerDeserializer = Deserializer<any, IncomingRequest>;
