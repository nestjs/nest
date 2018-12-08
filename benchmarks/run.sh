#!/usr/bin/env bash

echo 'Library:' $1
node $1 &
pid=$!

sleep 2

wrk 'http://localhost:3000' \
  -d 10 \
  -c 1024 \
  -t 8 

kill $pid