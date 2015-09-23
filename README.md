# smartcopy

A utility to assist with automating the backup process of SmartOS virtual machines (OS/LX zones and KVMs). It handles the process of creating snapshots, transferring them to the backup host (using a variety of methods) and rotating the local and remote snapshots to only maintain limited number. It will then dispatch notifications (currently via email) containing information about the backup success/failure.

These processes leverage the native ZFS snapshot send/receive functionality. At this stage, snapshots can only be transferred between hosts running ZFS.

There are currently 4 transfer methods (strategies):

- SSH (ssh)
- SSH with GZip (ssh_gzip)
- Mbuffer (mbuffer)
- Mbuffer with GZip (mbuffer_gzip)

Smartcopy intends to preserve clone structures. If Smartcopy detects that a filesystem or volume being backed up is a clone of another, it will first verify that the base is present on the remote system. If it is not, it will transfer the base filesystem/volume first.

## Requirements

### Backup Host in KnownHosts

The backup host must already exist in the SSH Known Hosts file.

### SSH Public Key Auth

Smartcopy makes extensive use of SSH to communicate with the remote backup host and as such, requires public key auth to be setup. The configuration.json file contains the following keys (among others):

```json
{
	"backupDestination": "192.168.38.134",
    "backupDestinationUsername": "root",
    "backupDestinationPrivateKeyPath": "/opt/smartcopy/id_rsa"
}
```
These settings influence the construction of any SSH commands used to communicate with the remote host. This allows you to have a separate RSA key-pair just for backup options and if so desired, different keys for each host.

If there are issues with SSH auth, it can be tested by running:

```bash
ssh [-i <backupDestinationPrivateKeyPath>] <backupDestinationUsername>@<backupDestination>
```

### Presence of MBuffer (if used)

MBuffer must be present at both the local and remote sides for it to be usable. The configuration.json file must contain the path to mbuffer for both sides (to avoid PATH issues when manipulating the remote host). Mbuffer is packaged with SmartCopy for use on a SmartOS host.

## Installing

There is a script contained in the repo called build_distribution.sh. The easiest way at this stage for mass deployment is to clone this repo, setup your configuration.json to suit your environment (if it is present during build, it will be included) and run this script. It will create a single file called 'install.sh' which contains everything needed for smartcopy to run. Get this file to your SmartOS host, run it and eveyrthing will be unpacked to /opt (so that it survives reboot).

## Using

The simpliest invocation is:
```bash
/path/to/bin/backup <virtual-machine-uuid>
```
This will create a snapshot named 'smartcopy-\<ISO Timestamp\>' and leverage the settings in configuration.json regarding transfer/rotation limits/notifications.

The 'smartcopy' part of the snapshot name is customisable and used to identify the backup batch. Rotation operations will only affect snapshots in the same batch. This is useful for when you want hourly and daily backups. The ISO timestamp can also be replaced. An example of this is:

```bash
/path/to/bin/backup --groupName daily --name snap22 <virtual-machine-uuid>
```

which will create a snapshot named 'daily-snap22'.

It is also possible to override the number of local and remote snapshots enforced by rotation and change the transfer strategy, as follows:

```bash
/path/to/bin/backup --transferStrategy ssh --localSnapLimit 3 --remoteSnapLimit 5 <virtual-machine-uuid>
```

All of the options mentioned above can be combined freely.

To automate these backup operations, add them to cron as a scheduled job.

## GZIP Options

The strategies including GZIP are customisable in that the compression/decompression method can be changed via configuration.json using the following keys:

```json
{
	"compressionCmd": "bzip2 -c",
    "decompressionCmd": "bzcat"
}
```

## Exclude from Backup

There is also a facility for excluding particular datasets or volumes from backup operations. This is useful if you have a KVM machine with a large zvol attached to it that contains non-critical data. This is done by setting the key "smartcopy_exclude" on the "internal_metadata" of the virtual machine. The format of the value is a comma-separated list of the filesystems/volumes names as they would appear in 'zfs list'. The output from vmadm get would look like:

```json
{
	"internal_metadata": {
    	"smartcopy_exclude": "zones/70a4f69b-b45b-420c-8d32-51ed45c1638a/data"
  	}
}
```

## A note about MBuffer

It will depend on your environment (network connectivity/disk IO capacity etc) as to whether you will see a benefit in using MBuffer. It is also worth noting that since smartcopy attempts to setup direct mbuffer to mbuffer transfers (bypassing SSH), there are some interesting failure conditions that require the explicit killing of the mbuffer processes should one fail.

If your hosts are bound by slower network links then you may not see much benefit and it is probably safer to stick with SSH.

Also be aware that depending on your MBuffer buffer sizes (both locally and remotely), free RAM levels (which ZFS ARC can eat into) and your level of backup concurrency, you may hit allocation issues. These errors should be reported to you during the normal notification process. MBuffer will attempt to allocate its entire buffer space immediately on launch.

## License
MIT.

## Bugs
See <https://github.com/davefinster/smartcopy/issues>.
