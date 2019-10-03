export interface Deserializer<TInput = any, TOutput = any> {
  deserialize(value: TInput): TOutput;
}
