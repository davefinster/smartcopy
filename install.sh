#!/bin/bash
INSTALL_PATH=/opt;
CONFIG_PATH=$INSTALL_PATH/smartcopy/configuration.json;
PRESERVE_CONFIG="false";
if [ "$1" == "-preserve-config" ]
  then
  PRESERVE_CONFIG="true";
fi
dir=$(dirname "$0");
if [ x"$dir" = "x." ]
then
    dir=$(pwd)
fi
base=$(basename "$0");
echo "Checking if configuration already exists";
backupDone=false;
if [ -f $CONFIG_PATH ]
  then
    echo "Found existing configuration - backing it up";
    cp $CONFIG_PATH $INSTALL_PATH/configuration.json.backup;
    backupDone=true
fi
if [ x"$dir" = "x." ]
then
    dir=$(pwd)
fi
echo "Installing to /opt - you will see a node folder and smartcopy folder";
cd "$INSTALL_PATH" || exit 1;
uudecode "$dir/$base";
tar -zxvf smartcopy.tar.gz;
rm smartcopy.tar.gz;
echo "File copy complete";
#if there is a config file already present (it came from the install payload)
#then use that unless -preserve-config is set
if [ -f "$CONFIG_PATH" ] && [ "$backupDone" == "true" ] && [ "$PRESERVE_CONFIG" == "true" ];
  then
  echo "Restore previous configuration";
  cp "$INSTALL_PATH/configuration.json.backup" "$CONFIG_PATH";
  rm "$INSTALL_PATH/configuration.json.backup";
  exit 0;
fi

if ! [ -f "$CONFIG_PATH" ] && [ "$backupDone" == "true" ];
  then
  echo "Restore previous configuration";
  cp "$INSTALL_PATH/configuration.json.backup" "$CONFIG_PATH";
  rm "$INSTALL_PATH/configuration.json.backup";
  exit 0;
fi

if ! [ -f "$CONFIG_PATH" ]
  then
  echo "No previous configuration - copying example";
  cp "$CONFIG_PATH.example" "$CONFIG_PATH";
  echo "Please ensure you check over the configuration documentation";
fi
exit 0;
