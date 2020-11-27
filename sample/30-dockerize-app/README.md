# Dockerize App NestJS

A simple example of Dockerfile for NestJS

## Execution

```sh
docker build -t nest-app .
docker run --name app -p 3000:3000 nest-app
```