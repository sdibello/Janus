# Database backups and recovery

Janus currently uses **one SQLite database**, `janus.db`, for both Identity and Campaigns. Back up the entire `Janus__DataDirectory`, including `keys/`, `campaign-keys/`, and any SQLite journal/WAL files. Docker Compose mounts this directory at `/data` in both containers through the shared `janus-data` volume. For non-container runs, use the configured directory or the operating system's local application data directory under `Janus` (see [local development](LOCAL-DEVELOPMENT.md)).

The examples below use a Linux host with rootful Docker Compose and upload archives to either AWS S3 or Azure Blob Storage. The host can be your Fedora machine or a VM. This provides off-machine backups of the current SQLite installation; it does not select a production cloud database or make the Development Compose configuration production-ready. No cloud resources or scheduled jobs are created by pulling this repository.

## What to back up and how often

- Start with a nightly backup, seven days of local copies, and 30 days in cloud storage. These are suggested settings: a nightly schedule can lose up to roughly a day of changes after the last successful backup. Back up before upgrades/migrations too.
- Save the application commit/image version and deployment configuration separately, including externally managed production certificates and their recovery process. Keep secrets in restricted secret storage rather than in Git.
- Treat archives as sensitive: they contain accounts, password hashes, campaign data, sessions, and private keys. Keep local copies restricted and the cloud destination private and encrypted. A checksum detects accidental corruption; it does not encrypt an archive or prove authenticity against an attacker who can replace both files.
- Test restoration monthly and after changing the backup setup. Check nightly failures and alert if no successful cloud backup has appeared for more than a day. A timer running successfully once is not evidence of ongoing recoverability.

For the simplest consistent full-directory copy, briefly stop **both** hosts and any other process using this data directory. Upload after restarting them. Do not copy just the live `.db` file: committed data may still be in its WAL. If downtime becomes unacceptable, use SQLite's [online backup API or `VACUUM INTO`](https://www.sqlite.org/backup.html) for a consistent database snapshot and design a coordinated key backup. See SQLite's [file-copy cautions](https://www.sqlite.org/howtocorrupt.html).

## Choose a cloud destination

Create the destination once using your administrative account. Use a dedicated backup identity for unattended uploads; keep recovery credentials accessible if the Janus host is lost. Neither provider CLI is included in the Janus containers: install the chosen CLI on the host.

### AWS S3

1. Create a dedicated S3 bucket in your chosen region. Keep **Block Public Access** enabled, use bucket-owner-enforced ownership, enable versioning, and keep server-side encryption enabled. The example uses SSE-S3 (`AES256`); if your bucket requires KMS, change the upload flags to `--sse aws:kms --sse-kms-key-id YOUR_KEY_ARN` and grant the required KMS access.
2. On EC2, attach an [instance role](https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/iam-roles-for-amazon-ec2.html) so AWS CLI v2 can obtain temporary credentials. For a Fedora machine outside AWS, configure an unattended credential provider/profile for the account running the backup (root in the timer below). A desktop SSO login that expires is insufficient for a nightly job. Keep credentials out of the script and repository.
3. Scope upload access to `s3:PutObject` on `arn:aws:s3:::YOUR_BUCKET/janus/*`, adding `s3:AbortMultipartUpload` for failed multipart uploads. The recovery operator needs `s3:GetObject` and, for browsing, bucket-level `s3:ListBucket` limited to the `janus/` prefix. Adjust permissions for KMS or your organization's policies.
4. Under bucket **Management → Lifecycle rules**, filter on `janus/`: expire current objects after 30 days, permanently remove noncurrent versions after an appropriate additional retention period, remove expired delete markers, and abort incomplete multipart uploads after seven days. In a versioned bucket, expiring current objects alone leaves older versions behind. See [S3 expiration behavior](https://docs.aws.amazon.com/AmazonS3/latest/userguide/lifecycle-expire-general-considerations.html).

The script uses [AWS CLI `s3 cp`](https://docs.aws.amazon.com/cli/latest/reference/s3/cp.html) for both the archive and checksum. Use unique filenames rather than overwriting a single `latest` object.

### Azure Blob Storage

1. Create a general-purpose v2 storage account and a private container named `janus-backups`. Require HTTPS, disable anonymous blob access, and retain storage encryption at rest. Enable blob versioning and blob/container soft delete with a recovery window such as seven days. See [Azure data protection options](https://learn.microsoft.com/en-us/azure/storage/blobs/data-protection-overview).
2. On an Azure VM, enable a system-assigned managed identity and grant **Storage Blob Data Contributor** scoped to that container. The example runs `az login --identity` before uploads. A generic subscription Contributor role does not itself grant blob data access. See [CLI blob authorization](https://learn.microsoft.com/en-us/azure/storage/blobs/authorize-data-operations-cli) and [managed identity login](https://learn.microsoft.com/en-us/cli/azure/authenticate-azure-cli-managed-identity).
3. On Fedora outside Azure, use an unattended service-principal/federated credential setup for the backup account instead; replace the managed-identity login line with that login procedure. Do not depend on an expiring interactive `az login` session or embed a secret in this guide's script. The restore operator needs **Storage Blob Data Reader** for downloading.
4. Under **Lifecycle management**, add a rule filtered to `janus-backups/janus/` to delete current block blobs 30 days after modification and delete previous versions/snapshots after your chosen retention period. Include both archives and checksum files. Soft-delete retention can delay final removal and add storage costs. See [Azure lifecycle management](https://learn.microsoft.com/en-us/azure/storage/blobs/lifecycle-management-overview).

Uploads and downloads use [`az storage blob`](https://learn.microsoft.com/en-us/cli/azure/storage/blob?view=azure-cli-latest) with `--auth-mode login`.

## Install the Linux backup job

Run this on the Docker host, with Docker/Compose, Bash, GNU tar/coreutils, `flock`, `sqlite3`, and the selected cloud CLI installed. On Fedora, `sudo dnf install sqlite util-linux` supplies SQLite and flock. Use the same Compose directory, `.env`, project name, and Docker daemon as your running installation. The example assumes the checkout is `/opt/janus`; substitute your actual path. It intentionally refuses to back up an installation whose two containers are not running, so an intentionally stopped app is not brought online by the timer. Coordinate deployments and manual backup/restore operations so they cannot write/start services during a backup.

Create `/etc/janus-backup.env`, owned by root with mode `600`, using **one** configuration:

```ini
# AWS example
JANUS_REPO=/opt/janus
BACKUP_PROVIDER=aws
S3_BUCKET=replace-with-your-backup-bucket
AWS_DEFAULT_REGION=us-east-1
# AWS_PROFILE=janus-backup
```

```ini
# Azure example (system-assigned identity on an Azure VM)
JANUS_REPO=/opt/janus
BACKUP_PROVIDER=azure
AZURE_STORAGE_ACCOUNT=replacewithyourstorageaccount
AZURE_CONTAINER=janus-backups
```

Save this script as `/usr/local/sbin/janus-backup`, owned by root with mode `700`. It archives the actual volume mounted by the Identity container rather than guessing Compose's volume-name prefix. For rootless/remote Docker, use a backup procedure running with that daemon's permissions and accessible storage paths instead.

```bash
#!/usr/bin/env bash
set -euo pipefail
umask 077
export PATH=/usr/local/bin:/usr/bin:/bin
exec 9>/run/lock/janus-backup.lock
flock -n 9 || { echo 'Another Janus backup is running.' >&2; exit 1; }
cd "${JANUS_REPO:?Set JANUS_REPO}"
compose=(docker compose)
# If the installation uses an explicit project name, use the same one here:
# compose=(docker compose -p YOUR_PROJECT)
case "${BACKUP_PROVIDER:?Set BACKUP_PROVIDER}" in
  aws) : "${S3_BUCKET:?Set S3_BUCKET}"; command -v aws >/dev/null ;;
  azure) : "${AZURE_STORAGE_ACCOUNT:?Set AZURE_STORAGE_ACCOUNT}"
         : "${AZURE_CONTAINER:?Set AZURE_CONTAINER}"; command -v az >/dev/null ;;
  *) echo 'BACKUP_PROVIDER must be aws or azure.' >&2; exit 1 ;;
esac
identity_id=$("${compose[@]}" ps --status running -q identity)
campaigns_id=$("${compose[@]}" ps --status running -q campaigns)
test -n "$identity_id" && test -n "$campaigns_id"
mount_format='{{range .Mounts}}{{if eq .Destination "/data"}}{{.Source}}{{end}}{{end}}'
data_dir=$(docker inspect --format "$mount_format" "$identity_id")
campaign_data_dir=$(docker inspect --format "$mount_format" "$campaigns_id")
test -n "$data_dir" && test "$data_dir" = "$campaign_data_dir"
test -f "$data_dir/janus.db"
backup_dir=/var/backups/janus
install -d -m 700 "$backup_dir"
name="janus-$(date -u +%Y%m%dT%H%M%SZ)-$$.tar.gz"
archive="$backup_dir/$name"
restart_needed=0
resume_hosts() {
  if (( restart_needed )); then
    "${compose[@]}" start identity campaigns
  fi
}
trap resume_hosts EXIT
# Set the trap before stopping, so a partially failed stop also attempts recovery.
restart_needed=1
"${compose[@]}" stop -t 60 campaigns identity
test "$(sqlite3 -readonly "$data_dir/janus.db" 'PRAGMA integrity_check;')" = ok
tar --acls --xattrs -czf "$archive.partial" -C "$data_dir" .
mv "$archive.partial" "$archive"
resume_hosts
restart_needed=0
gzip -t "$archive"
cd "$backup_dir"
sha256sum "$name" > "$name.sha256"
case "$BACKUP_PROVIDER" in
  aws)
    for file in "$name" "$name.sha256"; do
      aws s3 cp "$file" "s3://$S3_BUCKET/janus/$file" --sse AES256 --only-show-errors
    done
    ;;
  azure)
    az login --identity --output none
    for file in "$name" "$name.sha256"; do
      az storage blob upload --account-name "$AZURE_STORAGE_ACCOUNT" \
        --container-name "$AZURE_CONTAINER" --name "janus/$file" \
        --file "$file" --auth-mode login --overwrite false --output none
    done
    ;;
esac
# Prune local complete copies only after both uploads succeed. Failed/partial
# files are left for operator inspection; monitor available disk space.
find "$backup_dir" -maxdepth 1 -type f -name 'janus-*.tar.gz*' \
  ! -name '*.partial' -mtime +7 -delete
echo "Uploaded Janus backup: $name"
```

The EXIT trap attempts to restart both hosts on ordinary failures during archiving; host power loss or `kill -9` cannot run a trap. A restart failure or upload failure fails the job. The next run creates a new backup; it does not retry older failed uploads. To retry one, use the relevant upload commands above for its archive **and** checksum. A successful upload does not substitute for checking that both hosts recovered normally.

Create `/etc/systemd/system/janus-backup.service`:

```ini
[Unit]
Description=Back up Janus SQLite data and keys to cloud storage
Wants=network-online.target
After=network-online.target docker.service

[Service]
Type=oneshot
User=root
EnvironmentFile=/etc/janus-backup.env
ExecStart=/usr/local/sbin/janus-backup
TimeoutStartSec=infinity
```

Create `/etc/systemd/system/janus-backup.timer` (02:00 **UTC** daily, including a missed run after boot):

```ini
[Unit]
Description=Nightly Janus backup

[Timer]
OnCalendar=*-*-* 02:00:00 UTC
Persistent=true
RandomizedDelaySec=10m

[Install]
WantedBy=timers.target
```

Load the units and run one backup manually before enabling the schedule:

```sh
sudo systemctl daemon-reload
sudo systemctl start janus-backup.service
sudo journalctl -u janus-backup.service -n 50 --no-pager
sudo systemctl enable --now janus-backup.timer
systemctl list-timers janus-backup.timer
```

Confirm both objects exist in the cloud destination and perform the restore drill below. Set up an external alert for failed jobs or missing daily objects; journald alone does not notify you. Monitor disk space and upload duration as the data grows. Do not run two independent timers for the same data directory; choose one provider or explicitly extend a single job to upload to both before pruning.

## Download and test a restore

Use a private recovery directory on an isolated machine or test environment. Substitute an actual backup filename and storage names. The downloads must run as an identity with recovery permissions; the root service's cloud login is separate from your desktop login.

```bash
umask 077
mkdir -p "$HOME/janus-recovery"
cd "$HOME/janus-recovery"
name=janus-REPLACE_WITH_BACKUP_TIMESTAMP_AND_ID.tar.gz
```

Download from **one** provider:

```bash
# AWS
for file in "$name" "$name.sha256"; do
  aws s3 cp "s3://YOUR_BUCKET/janus/$file" "$file" --only-show-errors
done
```

```bash
# Azure: authenticate as the recovery identity first
for file in "$name" "$name.sha256"; do
  az storage blob download --account-name YOUR_ACCOUNT \
    --container-name janus-backups --name "janus/$file" \
    --file "$file" --auth-mode login --output none
done
```

Verify the checksum and restore into a **new empty directory**; do not extract over a running database or mix a recovered database with current WAL files/keys:

```bash
sha256sum -c "$name.sha256"
mkdir restored-data
tar --no-same-owner -xzf "$name" -C restored-data
sqlite3 restored-data/janus.db 'PRAGMA integrity_check;'
sqlite3 restored-data/janus.db 'PRAGMA foreign_key_check;'
```

Expect `ok` from the integrity check and no rows from the foreign-key check. Keep any journal/WAL files with the restored database so SQLite can recover them. Use the matching application version first. Point both test hosts' `Janus__DataDirectory` at the absolute `restored-data` path, keep them off public endpoints, and use separate test URLs/ports and corresponding identity redirect configuration. Copying keys does not guarantee login sessions or certificates work on a different OS/user: sign in again and verify certificate/key access. Production certificates held outside this directory must be recovered separately.

Check administrator login, campaigns and ownership, characters, a recent active encounter's order/HP/status/Hold data, and a disposable edit that survives restarting the test hosts. Record the archive name, application version, restore time, and outcome. Do not run the first-admin setup against recovered accounts. If upgrading afterward, back up the restored copy and apply Identity then Campaigns migrations as described in [local development](LOCAL-DEVELOPMENT.md).

For a real Compose recovery, disable the backup timer and stop both hosts first. Keep the current volume as a rollback copy. Create a **new** named volume, extract the verified archive into it with its original numeric ownership/permissions (using root on the Docker host), and mount that volume at `/data` in both services using a Compose override. For example, after creating and populating `janus-restored-data`, an override can select it without deleting the old volume:

```yaml
# /absolute/path/restore.compose.yaml
volumes:
  janus-data:
    external: true
    name: janus-restored-data
```

Run `docker volume create janus-restored-data`, find its host path with `docker volume inspect --format '{{.Mountpoint}}' janus-restored-data`, and extract the archive there with `sudo tar --numeric-owner --acls --xattrs -xzf /absolute/path/backup.tar.gz -C THE_NEW_VOLUME_PATH`. Double-check that this is the new empty volume before extracting. Start with `docker compose -f compose.yaml -f /absolute/path/restore.compose.yaml up -d`. Use the same override for subsequent Compose operations, verify both hosts' health and application data, and only then re-enable the timer. The backup script discovers the new mounted path; retain your override with the deployment configuration. Never use `docker compose down -v` during recovery.

For non-Docker hosts on Fedora or Windows, stop both Janus processes, copy the complete data directory while stopped, and restart them; use the same cloud upload/retention principles. Automating Windows shutdown/restart requires a job matching how you host the processes (for example, Task Scheduler plus Windows services). The Linux timer/script above does not run unchanged on Windows.

## Validation scope

On 2026-10-17, the documented Bash script passed syntax checking and local fixture checks for both cloud upload paths, archive/checksum round trips, SQLite and key restoration, and restart attempts after integrity-check/upload failures. The timer calendar expression and relative documentation links were also checked. These checks substituted Docker/cloud commands; no real containers, cloud accounts, or system services were changed.

Cloud setup and credentials must be tested in your own AWS/Azure account. The examples do not provision resources, configure monitoring, or install a timer automatically. VM/disk snapshots can complement these archives, but do not assume a crash-consistent disk snapshot replaces a tested SQLite-and-keys restore procedure. If Janus later moves to a managed database, replace this runbook with that engine's backup and point-in-time recovery procedure.
