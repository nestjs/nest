import express from 'express';

const app = express();

app.get('/', async (_, res) => {
  res.send('Hello world');
});

app.listen(3000);
