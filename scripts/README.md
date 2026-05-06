# Operational scripts

These scripts run on the production VPS at `/opt/prol/scripts/`. They are
versioned in the repo so changes go through git review.

## Backups

`backup.sh` runs daily via cron. It produces:

| Artifact | Path on host | Cadence |
|---|---|---|
| PostgreSQL custom-format dump | `/opt/prol/backups/db/prol_<ts>.dump` | every run |
| Uploads volume tarball | `/opt/prol/backups/uploads/uploads_<date>.tar.gz` | every run |

Retention defaults: **14 daily DB dumps**, **8 weekly upload tarballs**.

### Off-site (recommended for prod)

Local backups protect against accidental deletes and DB corruption but
not against the VPS dying. To enable off-site replication:

```bash
sudo apt-get install -y rclone
rclone config                              # set up your remote (R2/S3/B2)
# Then export the remote name in the cron environment:
echo 'BACKUP_RCLONE_REMOTE=r2:prol-backups' | sudo tee -a /etc/environment
```

Once the variable is set, the next `backup.sh` run will push every new
artifact to the remote.

### Cron entry on the VPS

```cron
# m h dom mon dow command
0 3 * * * /opt/prol/scripts/backup.sh >> /opt/prol/backups/backup.log 2>&1
```

Install with `sudo crontab -e`.

## Restore

`restore-db.sh` wipes the current `prol` database and restores from a
custom-format dump. Always stop the web container first:

```bash
docker compose -f /opt/prol/docker-compose.prod.yml stop web
/opt/prol/scripts/restore-db.sh /opt/prol/backups/db/prol_20260424_0300.dump
docker compose -f /opt/prol/docker-compose.prod.yml up -d web
```

To restore the uploads volume from a tarball:

```bash
docker compose stop web
docker run --rm \
  -v prol_prol_uploads:/data \
  -v /opt/prol/backups/uploads:/in:ro \
  alpine:3.20 \
  sh -c 'cd /data && tar xzf /in/uploads_20260424.tar.gz'
docker compose up -d web
```
