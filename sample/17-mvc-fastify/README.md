### Fastify MVC sample

Note that if you are running the Nest app on a remote machine, you may need to change the listen address, as per [these instructions](https://docs.nestjs.com/techniques/performance#adapter):

`await app.listen(3000, '0.0.0.0')`