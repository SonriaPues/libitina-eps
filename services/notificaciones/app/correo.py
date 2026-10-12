"""Arma el correo con la marca de Libitina y lo envía por SMTP (Mailpit o Gmail)."""
import html
import re
import smtplib
from email.message import EmailMessage
from . import config

DISENO = """<!doctype html><html lang="es"><body style="margin:0;background:#F7FAFD;font-family:Arial,Helvetica,sans-serif;color:#042F54">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;overflow:hidden">
<tr><td style="background:#021C33;padding:22px 32px;font-size:20px;font-weight:bold;color:#FFFFFF;letter-spacing:1px">LIBITINA <span style="color:#F6C220">EPS</span></td></tr>
<tr><td style="padding:32px;font-size:15px;line-height:1.6">{contenido}</td></tr>
<tr><td style="padding:18px 32px;background:#EEF4FA;font-size:12px;color:#2F70A8">Este correo se envió automáticamente, no lo respondas. Libitina EPS · Proyecto académico de la Universidad Católica de Colombia.</td></tr>
</table></td></tr></table></body></html>"""
BOTON = 'style="display:inline-block;background:#075699;color:#FFFFFF;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:bold"'


def renderizar(texto: str, variables: dict) -> str:
    # Las variables se escapan para que nadie pueda inyectar HTML en un correo.
    return re.sub(r"\{\{(\w+)\}\}", lambda m: html.escape(str(variables.get(m.group(1), ""))), texto)


def armar_html(cuerpo: str) -> str:
    return DISENO.format(contenido=cuerpo.replace('class="boton"', BOTON))


def enviar(destino: str, asunto: str, cuerpo_html: str):
    msg = EmailMessage()
    msg["From"], msg["To"], msg["Subject"] = config.CORREO_REMITENTE, destino, asunto
    msg.set_content(re.sub(r"<[^>]+>", " ", cuerpo_html))
    msg.add_alternative(cuerpo_html, subtype="html")
    with smtplib.SMTP(config.SMTP_HOST, config.SMTP_PORT, timeout=15) as s:
        if config.SMTP_TLS:
            s.starttls()
        if config.SMTP_USUARIO:
            s.login(config.SMTP_USUARIO, config.SMTP_CLAVE)
        s.send_message(msg)
