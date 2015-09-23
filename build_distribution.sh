#!/bin/bash

NODEJS_VERSION=4.1.0

echo "Creating temporary folder"
mkdir './build'
if [ ! -d ./build ]
  then
    echo "Could not create directory"
    exit 1
fi
cd ./build
echo "Downloading node.js"
NODE_URL="https://nodejs.org/dist/v$NODEJS_VERSION/node-v$NODEJS_VERSION-sunos-x64.tar.gz"
$(which curl) --insecure -o ./node.tar.gz $NODE_URL;
if [ ! -f ./node.tar.gz ]
  then
    echo "Node.js did not download"
    exit 1
fi
echo "Unpacking node.js"
tar -zxvf ./node.tar.gz > /dev/null;
rm ./node.tar.gz;
mv node-v$NODEJS_VERSION-sunos-x64 node;
chmod +x node/bin/node;
chmod +x node/bin/npm;
echo "Copying smartcopy files"
mkdir smartcopy;
mkdir smartcopy/bin;
mkdir smartcopy/lib;
cp -R ../bin ./smartcopy/bin;
cp -R ../lib ./smartcopy/lib;
cp -R ../configuration.json ./smartcopy/;
cp -R ../package.json ./smartcopy;
if [ ! -f ../configuration.json ]
  then
    echo "Detected configuration file - including in build"
    cp ../configuration.json ./smartcopy;
fi
echo "Installing dependencies";
cd smartcopy;
../node/bin/npm install;
cd ..;
echo "Building tarball";
tar -pczf smartcopy.tar.gz smartcopy/* node/*;
rm -rf smartcopy node;
echo "Building single run install";
cp ../install.sh ./;
uuencode smartcopy.tar.gz smartcopy.tar.gz >> install.sh;
rm smartcopy.tar.gz;
