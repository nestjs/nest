# NestJS with DynamoDB Data Matter Annotations
The `@aws/data-mapper-annotations` package is built on top of the AWS SDK. The introductory blog post with examples can be found [here](https://aws.amazon.com/blogs/developer/introducing-the-amazon-dynamodb-datamapper-for-javascript-developer-preview/) and the source code for the relevant packages can be found [here](https://github.com/awslabs/dynamodb-data-mapper-js/).

#### Running the local example
The local dynamoDB instance will be run using `docker-compose`. You'll need to install docker community edition. Then, you'll need to install node_modules (`npm i`).

After you have your dependencies installed, first run `npm run docker` to spin up the local dynamoDB container. Then, run `npm start` and the nestJS webserver should be listening on port `3001`. The available endpoints are:
- POST `localhost:3001/cats/createTable`
- POST `localhost:3001/cats/deleteTable`
- POST `localhost:3001/cats`
- GET `localhost:3001/cats`

You'll need to create the Cats table before you can POST a new cat. To verify that a table has been created, you can run
```
npm run list-tables
```
