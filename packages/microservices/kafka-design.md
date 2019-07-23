The more I think about how to implement Kafka into the nest microservices package the more opinionated it becomes because of the microservices abstraction layer.

First, Kafka employs a dumb broker and smart consumers communication style.  This means nest will have to be able to instantiate multiple consumers.  If nest is going to support multiple consumers, nest should also support multiple producers.  Subsequently, I think we should be able to define producers and consumers with decorators.

- `@KafkaConsumer` Property decorator to be access in the 
- `consumerOptions` https://github.com/tulios/kafkajs/blob/master/types/index.d.ts#L88
- `subscriptions` A collection of topic subscriptions https://github.com/tulios/kafkajs/blob/master/types/index.d.ts#L599
- `runOptions` https://github.com/tulios/kafkajs/blob/master/types/index.d.ts#L602
- `handlerMethod` enum (`eachBatch` or `eachMessage`) https://kafka.js.org/docs/consuming#a-name-each-message-a-eachmessage

Routing of consumed messages to class methods will use method decorators.  Messages can be routed by their topic, header, or value.

`@KafkaTopic(topic: string | RegExp)` Routes all messages of a topic to the method.
`@KafkaHeader(key: string, value?: string | RegExp)`  Routes all messages with matching headers.
`@KafkaValue(value: string | RegExp)` Routes all messages with matching values.


```ts
@Controller()
class KafkaController {
    @Client(kafkaClientOptions)
    private readonly client: ClientKafka;

    @KafkaConsumer(subscriptions, consumerOptions, handlerMethod, runOptions)
    private consumer: KafkaConsumer;

    private producer: KafkaProducer;

    onModuleInit() {
        this.producer = this.client.createProducer(producerOptions);
    }

    @KafkaTopic('test.1')
    public topicHandlerString(payload: any){
        // do something
    }

    @KafkaTopic(/test.*/i)
    public topicHandlerRegexp(payload: any){
        // do something
    }

    @KafkaHeader('key')
    public headerHandlerWithoutValue(payload: any){
        // do something
    }

    @KafkaHeader('key', 'value')
    public headerHandlerWithValue(payload: any){
        // do something
    }

    @KafkaHeader('key', /value.*/i)
    public headerHandlerWithValueRegex(payload: any){
        // do something
    }

    @KafkaValue('eventName')
    public valueHandler(payload: any){
        // do something
    }

    @KafkaValue(/eventPrefix.*/i)
    public valueHandler(payload: any){
        // do something
    }
}
```
