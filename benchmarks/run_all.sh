#!/usr/bin/env bash

: > all_output.txt

lib=(express fastify nest nest-fastify)
for item in ${lib[*]}
do
  echo '-----------------------' >> all_output.txt
  echo $item >> all_output.txt
  echo '-----------------------' >> all_output.txt

  node $item &
  pid=$!

  sleep 2
  
  wrk 'http://localhost:3000' \
    -d 10 \
    -c 1024 \
    -t 8 >> all_output.txt

    kill $pid
done