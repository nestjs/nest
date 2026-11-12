/**
 * @publicApi
 */
export class InvalidMqttTopicNameException extends Error {
  constructor() {
    super(
      'The MQTT topic name must not contain the wildcard characters "+" and "#", nor the null character',
    );
  }
}
