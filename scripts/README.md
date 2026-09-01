# Operational scripts

These scripts run on the production VPS at `/opt/prol/scripts/`. They are
versioned in the repo so changes go through git review.

## Backups

`backup.sh` runs daily via cron. It produces:

| Artifact | Path on host | Cadence |
|---|---|---|
| PostgreSQL custom-format dump | `/opt/prol/backups/db/prol_<ts>.dump` | every run (~1.2 MB) |
| Uploads volume tarball | `/opt/prol/backups/uploads/uploads_<date>.tar.gz` | **weekly, Sundays** (~1.5 GB) |
| Private volume tarball | `/opt/prol/backups/private/private_<date>.tar.gz` | every run (small) |

Retention defaults, **por cantidad y no por antigüedad**: `KEEP_DB=14`,
`KEEP_UPLOADS=8`, `KEEP_PRIVATE=30`. Estado estable ≈ 12 GB.

El tarball de uploads es **semanal a propósito**: pesa gigabytes, y generarlo a
diario conservando 8 semanas llenaría el disco (56 × 1.5 GB ≈ 84 GB). Se genera
los domingos, o cualquier día si todavía no existe ninguno; `FORCE_UPLOADS=1` lo
fuerza.

La poda va por cantidad para que el número de copias no dependa de la cadencia
real del cron: si el cron se para un mes, al volver no se borra el histórico de
golpe (que es exactamente lo que hacía `-mtime`).

**Runtime de contenedores.** El script elige `podman` o `docker` según cuál
exista, y `CONTAINER_CLI` lo fuerza. El host de producción corre podman y no
tiene binario `docker`; en local hay docker. Antes de esto el script estaba
atado a `docker` y **no podía correr en producción**.

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

To restore the private volume (evidencias y plantillas confidenciales) from a tarball:

```bash
docker compose stop web
docker run --rm \
  -v prol_prol_private:/data \
  -v /opt/prol/backups/private:/in:ro \
  alpine:3.20 \
  sh -c 'cd /data && tar xzf /in/private_20260424.tar.gz'
docker compose up -d web
```
