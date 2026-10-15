"""Certificado de afiliación en PDF con la marca de Libitina y un código QR de verificación.

El PDF no se guarda: se vuelve a generar idéntico a partir de los datos que quedaron
congelados en el trámite el día en que se expidió.
"""
from io import BytesIO
from pathlib import Path
from reportlab.graphics import renderPDF
from reportlab.graphics.barcode.qr import QrCodeWidget
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, Table, TableStyle
from reportlab.pdfgen.canvas import Canvas

AZUL, NOCHE, DORADO, GRIS = colors.HexColor("#075699"), colors.HexColor("#021C33"), colors.HexColor("#F6C220"), colors.HexColor("#5A7390")
LOGO = Path(__file__).parent / "recursos" / "logo.png"
PARENTESCOS = {"conyuge": "Cónyuge", "companero_permanente": "Compañero(a) permanente", "hijo": "Hijo(a)", "padre": "Padre", "madre": "Madre"}
TEXTO = ParagraphStyle("texto", fontName="Helvetica", fontSize=10.5, leading=16, textColor=NOCHE)


def _qr(c: Canvas, contenido: str, x: float, y: float, lado: float) -> None:
    w = QrCodeWidget(contenido)
    x0, y0, x1, y1 = w.getBounds()
    d = Drawing(lado, lado, transform=[lado / (x1 - x0), 0, 0, lado / (y1 - y0), 0, 0])
    d.add(w)
    renderPDF.draw(d, c, x, y)


def certificado_afiliacion(datos: dict, radicado: str, codigo: str, url_verificacion: str) -> bytes:
    buf = BytesIO()
    c = Canvas(buf, pagesize=letter, pageCompression=1)
    ancho, alto = letter
    c.setTitle(f"Certificado de afiliación {radicado}")
    c.setAuthor("Libitina EPS")

    # Encabezado
    c.setFillColor(NOCHE)
    c.rect(0, alto - 34 * mm, ancho, 34 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.roundRect(18 * mm, alto - 28 * mm, 34 * mm, 22 * mm, 3 * mm, stroke=0, fill=1)
    c.drawImage(str(LOGO), 20 * mm, alto - 27 * mm, width=30 * mm, height=20 * mm, preserveAspectRatio=True, mask="auto")
    c.setFont("Helvetica-Bold", 20)
    c.drawString(58 * mm, alto - 16 * mm, "LIBITINA")
    c.setFillColor(DORADO)
    c.drawString(58 * mm + c.stringWidth("LIBITINA ", "Helvetica-Bold", 20), alto - 16 * mm, "EPS")
    c.setFillColor(colors.HexColor("#BFD6EA"))
    c.setFont("Helvetica", 9)
    c.drawString(58 * mm, alto - 22 * mm, "Entidad Promotora de Salud · Proyecto académico")
    c.setFillColor(colors.white)
    c.setFont("Helvetica", 9)
    c.drawRightString(ancho - 18 * mm, alto - 15 * mm, f"Radicado {radicado}")
    c.drawRightString(ancho - 18 * mm, alto - 21 * mm, f"Expedido el {datos['expedido_texto']}")

    # Título
    y = alto - 52 * mm
    c.setFillColor(AZUL)
    c.setFont("Helvetica-Bold", 17)
    c.drawString(18 * mm, y, "CERTIFICADO DE AFILIACIÓN")
    c.setStrokeColor(DORADO)
    c.setLineWidth(2)
    c.line(18 * mm, y - 4 * mm, 58 * mm, y - 4 * mm)

    # Cuerpo
    t = datos["titular"]
    regimen = "contributivo" if datos["regimen"] == "contributivo" else "subsidiado"
    detalle_regimen = f", categoría {datos['categoria']}" if datos.get("categoria") else (f", grupo Sisbén {datos['grupo_sisben']}" if datos.get("grupo_sisben") else "")
    cuerpo = (f"Libitina EPS certifica que <b>{t['nombre'].upper()}</b>, identificado(a) con <b>{t['documento']}</b>, "
              f"se encuentra afiliado(a) en estado <b>ACTIVO</b> en calidad de <b>cotizante</b> del régimen <b>{regimen}</b>"
              f"{detalle_regimen}, desde el {datos['fecha_afiliacion_texto']}, con <b>{datos['ips']}</b> como IPS de atención primaria.")
    p = Paragraph(cuerpo, TEXTO)
    _, h = p.wrap(ancho - 36 * mm, 200)
    y -= 14 * mm + h
    p.drawOn(c, 18 * mm, y)

    # Grupo familiar
    y -= 12 * mm
    c.setFillColor(NOCHE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(18 * mm, y, "Grupo familiar")
    filas = [["Nombre", "Documento", "Parentesco", "Estado"]]
    filas += [[b["nombre"], b["documento"], PARENTESCOS.get(b["parentesco"], b["parentesco"]), b["estado"].capitalize()]
              for b in datos["beneficiarios"]] or [["Sin beneficiarios registrados", "", "", ""]]
    tabla = Table(filas, colWidths=[68 * mm, 42 * mm, 42 * mm, 26 * mm])
    tabla.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 9), ("FONT", (0, 1), (-1, -1), "Helvetica", 9),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("BACKGROUND", (0, 0), (-1, 0), AZUL),
        ("TEXTCOLOR", (0, 1), (-1, -1), NOCHE), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#EEF4FA")]),
        ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5), ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#BFD6EA")),
    ]))
    _, h = tabla.wrap(0, 0)
    y -= 4 * mm + h
    tabla.drawOn(c, 18 * mm, y)

    # Vigencia
    y -= 12 * mm
    p = Paragraph(f"Este certificado se expide a solicitud del interesado y es válido hasta el <b>{datos['vigente_texto']}</b>. "
                  "Su autenticidad puede verificarse en línea con el código o el QR de esta página.", TEXTO)
    _, h = p.wrap(ancho - 36 * mm, 200)
    y -= h
    p.drawOn(c, 18 * mm, y)

    # Verificación
    caja_y = 34 * mm
    c.setFillColor(colors.HexColor("#F7FAFD"))
    c.setStrokeColor(colors.HexColor("#BFD6EA"))
    c.roundRect(18 * mm, caja_y, ancho - 36 * mm, 42 * mm, 3 * mm, stroke=1, fill=1)
    _qr(c, url_verificacion, 22 * mm, caja_y + 4 * mm, 34 * mm)
    c.setFillColor(NOCHE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(62 * mm, caja_y + 29 * mm, "Verificación del certificado")
    c.setFont("Helvetica", 9.5)
    c.setFillColor(GRIS)
    c.drawString(62 * mm, caja_y + 22 * mm, "Escanea el código QR o ingresa el código en:")
    c.setFillColor(AZUL)
    c.drawString(62 * mm, caja_y + 16 * mm, url_verificacion.split("?")[0])
    c.setFillColor(NOCHE)
    c.setFont("Courier-Bold", 15)
    c.drawString(62 * mm, caja_y + 7 * mm, codigo)

    # Pie
    c.setFont("Helvetica", 7.5)
    c.setFillColor(GRIS)
    c.drawCentredString(ancho / 2, 20 * mm, "Documento generado electrónicamente por Libitina EPS. No requiere firma.")
    c.drawCentredString(ancho / 2, 15 * mm, "Libitina EPS es un proyecto académico de la Universidad Católica de Colombia: "
                                            "este certificado no tiene validez legal.")
    c.showPage()
    c.save()
    return buf.getvalue()
