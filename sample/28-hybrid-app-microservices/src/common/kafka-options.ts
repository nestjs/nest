export default {
  client: {
    clientId: 'default',
    brokers: ['localhost:9092'],
    ssl: false,
  },
  consumer: {
    groupId: 'default-consumer',
  },
};
