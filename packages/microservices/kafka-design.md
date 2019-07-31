The more I think about how to implement Kafka into the nest microservices package the more opinionated it becomes because of the microservices abstraction layer.

First, Kafka employs a dumb broker and smart consumers communication style.  This means nest should be able to instantiate multiple consumers.  If nest is going to support multiple consumers, nest should also support multiple producers.  Subsequently, the instantiated consumers should be accessible by methods consuming messages.

- `@KafkaConsumer` Property decorator to be accessible by methods.
- `consumerOptions` https://github.com/tulios/kafkajs/blob/master/types/index.d.ts#L88
- `subscriptions` A collection of topic subscriptions https://github.com/tulios/kafkajs/blob/master/types/index.d.ts#L599
- `handlerMethod?` enum (`eachBatch` or `eachMessage`) https://kafka.js.org/docs/consuming#a-name-each-message-a-eachmessage
- `runOptions?` https://github.com/tulios/kafkajs/blob/master/types/index.d.ts#L602

Routing of consumed messages to class methods will use method decorators.  Messages can be routed by their topic, header, or value with routes being prioritized in that order.

`@KafkaTopic(consumer: KafkaConsumer, topic: string | RegExp)` Routes all messages of a topic to the method.
`@KafkaHeader(consumer: KafkaConsumer, key: string, value?: string | RegExp)`  Routes all messages with matching headers.
`@KafkaValue(consumer: KafkaConsumer, value: string | RegExp)` Routes all messages with matching values.  This would possibly require something like Avro (https://avro.apache.org/docs/current/spec.html#preamble)

The payload passed to the message handlers will be either type of `EachMessagePayload` (https://github.com/tulios/kafkajs/blob/master/types/index.d.ts#L580) or `EachBatchPayload` (https://github.com/tulios/kafkajs/blob/master/types/index.d.ts#L586) which is determined by the handlerMethod. 

```ts
@Controller()
class KafkaController {
    @Client(kafkaClientOptions)
    private readonly client: ClientKafka;

    @KafkaConsumer(consumerOptions, subscriptions, handlerMethod, runOptions)
    private consumer: KafkaConsumer;

    private producer: KafkaProducer;

    onModuleInit() {
        this.producer = this.client.createProducer(producerOptions);
    }

    @KafkaTopic(this.consumer, 'test.1')
    public topicHandlerString(payload: any){
        // do something
    }

    @KafkaTopic(this.consumer, /test.*/i)
    public topicHandlerRegexp(payload: any){
        // do something
    }

    @KafkaHeader(this.consumer, 'key')
    public headerHandlerWithoutValue(payload: any){
        // do something
    }

    @KafkaHeader(this.consumer, 'key', 'value')
    public headerHandlerWithValue(payload: any){
        // do something
    }

    @KafkaHeader(this.consumer, 'key', /value.*/i)
    public headerHandlerWithValueRegex(payload: any){
        // do something
    }

    @KafkaValue(this.consumer, 'eventName')
    public valueHandler(payload: any){
        // do something
    }

    @KafkaValue(this.consumer, /eventPrefix.*/i)
    public valueHandlerWithRegExp(payload: any){
        // do something
    }
}
```

Thoughts?