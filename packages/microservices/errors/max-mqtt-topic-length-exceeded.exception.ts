/**
 * @publicApi
 */
export class MaxMqttTopicLengthExceededException extends Error {
  constructor(length: number, maxLength: number) {
    super(
      `The MQTT topic length (${length} bytes) exceeds the maximum allowed ${maxLength} bytes`,
    );
  }
}
