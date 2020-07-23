'use strict';

const express = require('express');
const app = express();

app.get('/', async (req, res) => res.send('Hello world'));



app.listen(3000);
