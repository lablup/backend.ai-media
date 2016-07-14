#! /bin/bash
hash=$(webpack | grep 'Hash: ' | awk '{ print $2; }')
cd assets
rm latest
ln -s $hash latest
for name in $(ls | grep '[a-f0-9]\{20\}' | grep -v $hash); do
  rm -r $name
done
