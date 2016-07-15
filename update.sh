#! /bin/bash
raw_hash=$(webpack --color | tee >(cat 1>&2) | grep 'Hash: ' | awk '{ print $2; }')
hash=$(echo $raw_hash | perl -pe 's/\e\[?.*?[\@-~]//g')
cd assets
for name in $(ls | grep '[a-f0-9]\{20\}' | grep -v $hash); do
  rm -r $name
done
