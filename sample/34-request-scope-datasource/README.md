# Request scoped DataSource
## Description

A simplified example that demonstrates how to load a specific DataSource based on the user making the request.

## Databases context initialization

```bash
$ docker-compose up -d
```

## Installation

```bash
$ npm ci
```

## Running the app

```bash
$ npm run start
```

## Testing the app

You can run a curl with the client id in the header : 

For client 1 :
```bash
curl -X GET "http://localhost:3000/products/all" -H "Content-Type: application/json" -H "client-id: client1"
```

For client 2 :
```bash
curl -X GET "http://localhost:3000/products/all" -H "Content-Type: application/json" -H "client-id: client2"
```

The response contains the client 1 products or client 2 product, depending on the given id.

## What happened
1. The `MainDbConnectionModule` initializes the configuration for the main database, which contains the connection details for each client's database.
2. The `ClientDbConnectionModule` is set to request scope, meaning the factory to get the connection will be executed for each request. It extracts the `client-id` header from the request.
3. Based on the `client-id` value, it retrieves the client's database connection details from the main database provided by the `MainDbConnectionModule`.
4. It returns a valid connection to the appropriate client's database in the injectable `DataSource` with token `ON_PREMISE_DB_CONNECTION`.
5. The `ProductController` can then execute SQL commands on the correct database.

Adapt this to your specific context as needed.


## Stay in touch

- Author - [Alexandre Decollas](https://alexandredecollas.com)

## License

This demo is [MIT licensed](LICENSE).
