# Quadlets — fuente de verdad del despliegue

Producción **no** usa `docker compose`. Corre Podman 5.4.2 con quadlets de
systemd en `/etc/containers/systemd/`. `docker-compose.prod.yml` es referencia
de desarrollo y no describe lo que corre.

Estos archivos son la copia versionada de lo que hay en el host. Se editan aquí
y se copian allí, no al revés.

## Instalar

```bash
scp deploy/quadlets/<instancia>-*.container \
    deploy/quadlets/<instancia>-internal.network \
    propodvps2:/etc/containers/systemd/
ssh propodvps2 'systemctl daemon-reload && systemctl start <instancia>-db <instancia>-web'
```

## El ruteo NO va en los quadlets

Traefik monta el socket de Podman, así que las labels *funcionarían*… salvo que
las reglas llevan espacios, y `Label=` de Quadlet las trunca en el primer
espacio y se come los escapes. Por eso el propio `traefik-podman.yml` del host
declara que **todo el ruteo vive en el proveedor de fichero**.

El router y el service de cada instancia van en
`/opt/traefik/dynamic/routes.yml`. En `deploy/traefik/` está el fragmento a
insertar en ese archivo, que es compartido con los otros ~20 servicios del host
y por eso no se sobrescribe entero.

## Detalles que muerden

- **`HealthCmd` del contenedor de base lleva el usuario y la base escritos a
  mano** (`pg_isready -U <user> -d <db>`). No sale del entorno: al renombrar la
  base hay que cambiarlo aquí también, o la unit se queda `unhealthy` sin que
  nada esté realmente roto.
- **`Pull=never`**: la imagen se construye en el host y se etiqueta a mano. Si
  el tag de la instancia no existe, la unit no arranca — y no lo intenta
  descargar, que es lo que se quiere en un host sin registry.
- **Cada instancia tiene su propio tag móvil** (`prol-web:ibiza`,
  `prol-web:prol`) sobre el mismo SHA. Sin eso, un `latest` compartido haría
  que desplegar a una cambiara la otra en su siguiente reinicio.
