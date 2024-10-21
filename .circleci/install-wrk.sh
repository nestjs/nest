#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"

# based on https://medium.com/@felipedutratine/intelligent-benchmark-with-wrk-163986c1587f

cd /tmp/
sudo apt-get install build-essential libssl-dev git -y
git clone --depth=1 https://github.com/wg/wrk.git wrk
cd wrk
sudo make
# move the executable to somewhere in your PATH, ex:
sudo cp wrk /usr/local/bin
