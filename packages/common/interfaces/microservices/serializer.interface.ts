export interface Serializer<TInput = any, TOutput = any> {
  serialize(value: TInput): TOutput;
}
