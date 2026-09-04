#!/usr/bin/env python3
"""
Envía un aviso a todos los usuarios activos de un tenant, por Postmark.

Existe porque la plataforma no tiene pantalla para mandar un comunicado: sólo
los barridos de encuestas y cumplimiento llaman a `sendBulkEmail`. Se corre en
el host, donde vive el token.

  send-notice.py --tenant ibiza-online --html a.html --text a.txt \
                 --subject "..." [--stream broadcast] [--send]

SIN --send sólo simula: imprime a quién iría y no manda nada. Es el modo por
defecto a propósito — un envío a decenas de personas no se deshace.
"""
import argparse, json, subprocess, sys, urllib.request

ENV = "/etc/containers/env/ibiza-web.env"
API = "https://api.postmarkapp.com/email/batch"
# Direcciones de prueba que nunca deben recibir un comunicado real.
EXCLUIR = ("@demo.com", "@example.com", "@example.test", "@test.com")


def env(name, path=ENV):
    for line in open(path, encoding="utf-8"):
        if line.startswith(name + "="):
            return line.split("=", 1)[1].strip().strip("\"'")
    return None


def destinatarios(container, dbuser, db, tenant):
    sql = (
        "select u.email from users u join tenants t on t.id=u.tenant_id "
        f"where t.slug='{tenant}' and u.disabled_at is null "
        "and u.email is not null order by u.email;"
    )
    out = subprocess.run(
        ["podman", "exec", container, "psql", "-U", dbuser, "-d", db, "-tAc", sql],
        capture_output=True, text=True, check=True,
    ).stdout
    correos = [e.strip() for e in out.splitlines() if e.strip()]
    return [e for e in correos if not any(e.lower().endswith(x) for x in EXCLUIR)]


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--tenant", required=True)
    p.add_argument("--html", required=True)
    p.add_argument("--text", required=True)
    p.add_argument("--subject", required=True)
    p.add_argument("--from-addr", default=None)
    p.add_argument("--reply-to", default=None)
    p.add_argument("--stream", default="broadcast")
    p.add_argument("--container", default="ibiza-db")
    p.add_argument("--dbuser", default="ibiza")
    p.add_argument("--db", default="ibiza")
    p.add_argument("--send", action="store_true", help="sin esto, sólo simula")
    a = p.parse_args()

    token = env("POSTMARK_SERVER_TOKEN")
    if not token:
        sys.exit("No hay POSTMARK_SERVER_TOKEN en " + ENV)

    nombre = env("EMAIL_FROM_NAME") or "Ibiza Online"
    remitente = a.from_addr or f'"{nombre}" <{env("EMAIL_FROM_ADDRESS")}>'
    responder = a.reply_to or env("EMAIL_REPLY_TO")

    html = open(a.html, encoding="utf-8").read()
    text = open(a.text, encoding="utf-8").read()
    correos = destinatarios(a.container, a.dbuser, a.db, a.tenant)

    print(f"tenant     : {a.tenant}")
    print(f"remitente  : {remitente}")
    print(f"responder a: {responder}")
    print(f"stream     : {a.stream}")
    print(f"asunto     : {a.subject}")
    print(f"destinatarios: {len(correos)}")
    for e in correos:
        print("   ", e)

    if not a.send:
        print("\nSIMULACIÓN: no se envió nada. Añade --send para enviar de verdad.")
        return

    mensajes = [
        {"From": remitente, "To": e, "Subject": a.subject, "HtmlBody": html,
         "TextBody": text, "ReplyTo": responder, "MessageStream": a.stream}
        for e in correos
    ]
    # Postmark admite 500 por llamada; se trocea igualmente para que una lista
    # que crezca no falle entera con un 422.
    resultados = []
    for i in range(0, len(mensajes), 500):
        req = urllib.request.Request(
            API, data=json.dumps(mensajes[i:i + 500]).encode(),
            headers={"Accept": "application/json", "Content-Type": "application/json",
                     "X-Postmark-Server-Token": token}, method="POST")
        with urllib.request.urlopen(req, timeout=60) as r:
            resultados += json.loads(r.read())

    fallos = [x for x in resultados if x.get("ErrorCode") != 0]
    print(f"\nentregados a Postmark: {len(resultados) - len(fallos)} de {len(resultados)}")
    for f in fallos:
        print(f"  FALLO {f.get('To')}: {f.get('ErrorCode')} {f.get('Message')}")
    sys.exit(1 if fallos else 0)


if __name__ == "__main__":
    main()
