"""Fórmula médica e incapacidad en PDF, con la marca de Libitina y un QR de verificación.

Los PDF no se guardan: se generan a partir de lo que quedó (cifrado) en la base.
"""
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape
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
CLARO, BORDE = colors.HexColor("#F7FAFD"), colors.HexColor("#BFD6EA")
LOGO = Path(__file__).parent / "recursos" / "logo.png"
TEXTO = ParagraphStyle("texto", fontName="Helvetica", fontSize=10.5, leading=15.5, textColor=NOCHE)
CELDA = ParagraphStyle("celda", fontName="Helvetica", fontSize=9, leading=12, textColor=NOCHE)
ANCHO, ALTO = letter
M = 18 * mm


def _qr(c, contenido, x, y, lado):
    w = QrCodeWidget(contenido)
    x0, y0, x1, y1 = w.getBounds()
    d = Drawing(lado, lado, transform=[lado / (x1 - x0), 0, 0, lado / (y1 - y0), 0, 0])
    d.add(w)
    renderPDF.draw(d, c, x, y)


def _encabezado(c, titulo, codigo, expedido):
    c.setFillColor(NOCHE)
    c.rect(0, ALTO - 34 * mm, ANCHO, 34 * mm, stroke=0, fill=1)
    c.setFillColor(colors.white)
    c.roundRect(M, ALTO - 28 * mm, 34 * mm, 22 * mm, 3 * mm, stroke=0, fill=1)
    c.drawImage(str(LOGO), 20 * mm, ALTO - 27 * mm, width=30 * mm, height=20 * mm, preserveAspectRatio=True, mask="auto")
    c.setFont("Helvetica-Bold", 20)
    c.drawString(58 * mm, ALTO - 16 * mm, "LIBITINA")
    c.setFillColor(DORADO)
    c.drawString(58 * mm + c.stringWidth("LIBITINA ", "Helvetica-Bold", 20), ALTO - 16 * mm, "EPS")
    c.setFillColor(colors.HexColor("#BFD6EA"))
    c.setFont("Helvetica", 9)
    c.drawString(58 * mm, ALTO - 22 * mm, "Entidad Promotora de Salud · Proyecto académico")
    c.setFillColor(colors.white)
    c.drawRightString(ANCHO - M, ALTO - 15 * mm, f"Código {codigo}")
    c.drawRightString(ANCHO - M, ALTO - 21 * mm, f"Expedida el {expedido}")
    y = ALTO - 50 * mm
    c.setFillColor(AZUL)
    c.setFont("Helvetica-Bold", 17)
    c.drawString(M, y, titulo)
    c.setStrokeColor(DORADO)
    c.setLineWidth(2)
    c.line(M, y - 4 * mm, M + 40 * mm, y - 4 * mm)
    return y - 10 * mm


def _datos(c, y, filas):
    """Bloque de datos (paciente, profesional…) en dos columnas."""
    tabla = Table([[Paragraph(f"<font color='#8F690C' size='8'>{escape(k)}</font><br/>{escape(str(v))}", CELDA) for k, v in par] for par in filas],
                  colWidths=[(ANCHO - 2 * M) / 2] * 2)
    tabla.setStyle(TableStyle([("BACKGROUND", (0, 0), (-1, -1), CLARO), ("BOX", (0, 0), (-1, -1), 0.5, BORDE),
                               ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5), ("LEFTPADDING", (0, 0), (-1, -1), 8)]))
    _, h = tabla.wrap(0, 0)
    tabla.drawOn(c, M, y - h)
    return y - h


def _parrafo(c, y, html, estilo=TEXTO):
    p = Paragraph(html, estilo)
    _, h = p.wrap(ANCHO - 2 * M, 400)
    p.drawOn(c, M, y - h)
    return y - h


def _pie(c, url, codigo, firma):
    caja_y = 34 * mm
    c.setStrokeColor(GRIS)
    c.setLineWidth(0.6)
    c.line(ANCHO - M - 70 * mm, caja_y + 54 * mm, ANCHO - M, caja_y + 54 * mm)
    c.setFillColor(NOCHE)
    c.setFont("Helvetica-Bold", 9.5)
    c.drawRightString(ANCHO - M, caja_y + 49 * mm, firma[0])
    c.setFont("Helvetica", 8.5)
    c.setFillColor(GRIS)
    c.drawRightString(ANCHO - M, caja_y + 44.5 * mm, firma[1])
    c.setFillColor(CLARO)
    c.setStrokeColor(BORDE)
    c.roundRect(M, caja_y, ANCHO - 2 * M, 38 * mm, 3 * mm, stroke=1, fill=1)
    _qr(c, url, 22 * mm, caja_y + 3 * mm, 32 * mm)
    c.setFillColor(NOCHE)
    c.setFont("Helvetica-Bold", 11)
    c.drawString(60 * mm, caja_y + 26 * mm, "Verificación del documento")
    c.setFont("Helvetica", 9)
    c.setFillColor(GRIS)
    c.drawString(60 * mm, caja_y + 20 * mm, "Escanea el QR o ingresa el código en la página de verificación:")
    c.setFillColor(AZUL)
    c.drawString(60 * mm, caja_y + 14.5 * mm, url.split("?")[0])
    c.setFillColor(NOCHE)
    c.setFont("Courier-Bold", 15)
    c.drawString(60 * mm, caja_y + 6 * mm, codigo)
    c.setFont("Helvetica", 7.5)
    c.setFillColor(GRIS)
    c.drawCentredString(ANCHO / 2, 22 * mm, "La verificación confirma la autenticidad del documento; por reserva, no muestra su contenido clínico.")
    c.drawCentredString(ANCHO / 2, 17 * mm, "Libitina EPS es un proyecto académico de la Universidad Católica de Colombia: este documento no tiene validez legal.")


def _profesional(d):
    return [("Paciente", d["paciente_nombre"]), ("Documento", d["paciente_documento"])], \
           [("Profesional", d["doctor_nombre"] or "Profesional de Libitina"), ("Especialidad", d["especialidad"] or "")]


def formula_medica(d: dict, url: str) -> bytes:
    buf = BytesIO()
    c = Canvas(buf, pagesize=letter, pageCompression=1)
    c.setTitle(f"Fórmula médica {d['codigo']}")
    c.setAuthor("Libitina EPS")
    y = _encabezado(c, "FÓRMULA MÉDICA", d["codigo"], d["expedida_texto"])
    y = _datos(c, y, [*_profesional(d), [("Diagnóstico", d["diagnostico"]), ("Válida hasta", d["vigente_texto"])]])
    filas = [["Medicamento", "Dosis y frecuencia", "Vía", "Duración", "Cant."]]
    filas += [[Paragraph(f"<b>{escape(m['medicamento'])}</b><br/><font color='#5A7390'>{escape(m.get('presentacion') or '')}</font>", CELDA),
               Paragraph(escape(f"{m['dosis']} {m['frecuencia']}"), CELDA), m.get("via") or "", m["duracion"], str(m["cantidad"])]
              for m in d["medicamentos"]]
    tabla = Table(filas, colWidths=[64 * mm, 50 * mm, 18 * mm, 26 * mm, 20 * mm], repeatRows=1)
    tabla.setStyle(TableStyle([
        ("FONT", (0, 0), (-1, 0), "Helvetica-Bold", 9), ("FONT", (0, 1), (-1, -1), "Helvetica", 9),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white), ("BACKGROUND", (0, 0), (-1, 0), AZUL),
        ("TEXTCOLOR", (0, 1), (-1, -1), NOCHE), ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#EEF4FA")]),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("TOPPADDING", (0, 0), (-1, -1), 5), ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("BOX", (0, 0), (-1, -1), 0.5, BORDE)]))
    _, h = tabla.wrap(0, 0)
    y -= 8 * mm + h
    tabla.drawOn(c, M, y)
    if d.get("indicaciones"):
        y = _parrafo(c, y - 7 * mm, f"<b>Indicaciones:</b> {escape(d['indicaciones'])}")
    _parrafo(c, y - 6 * mm, "Reclama los medicamentos en la farmacia de tu IPS presentando este documento y tu documento de identidad. "
                            "La fórmula vence en 30 días.", ParagraphStyle("nota", parent=TEXTO, fontSize=9, textColor=GRIS))
    _pie(c, url, d["codigo"], (d["doctor_nombre"] or "Profesional de Libitina", d["especialidad"] or ""))
    c.showPage()
    c.save()
    return buf.getvalue()


TIPOS_INCAPACIDAD = {"enfermedad_general": "Enfermedad general", "accidente_comun": "Accidente común",
                     "accidente_laboral": "Accidente de trabajo", "enfermedad_laboral": "Enfermedad laboral"}


def incapacidad(d: dict, url: str) -> bytes:
    buf = BytesIO()
    c = Canvas(buf, pagesize=letter, pageCompression=1)
    c.setTitle(f"Incapacidad médica {d['codigo']}")
    c.setAuthor("Libitina EPS")
    y = _encabezado(c, "CERTIFICADO DE INCAPACIDAD", d["codigo"], d["expedida_texto"])
    y = _datos(c, y, [*_profesional(d), [("Origen", TIPOS_INCAPACIDAD[d["tipo"]]), ("Diagnóstico", d["diagnostico"])]])
    dias = d["dias"]
    y = _parrafo(c, y - 9 * mm,
                 f"El profesional que firma certifica que <b>{escape(d['paciente_nombre'].upper())}</b>, identificado(a) con "
                 f"<b>{escape(d['paciente_documento'])}</b>, requiere incapacidad médica por <b>{dias} {'día' if dias == 1 else 'días'}</b>, "
                 f"desde el <b>{d['inicio_texto']}</b> hasta el <b>{d['fin_texto']}</b>, ambos inclusive.")
    caja = Table([[Paragraph(f"<font size='8' color='#8F690C'>DESDE</font><br/><b>{d['inicio_texto']}</b>", CELDA),
                   Paragraph(f"<font size='8' color='#8F690C'>HASTA</font><br/><b>{d['fin_texto']}</b>", CELDA),
                   Paragraph(f"<font size='8' color='#8F690C'>DÍAS</font><br/><font size='16'><b>{dias}</b></font>", CELDA)]],
                 colWidths=[(ANCHO - 2 * M) * 0.4, (ANCHO - 2 * M) * 0.4, (ANCHO - 2 * M) * 0.2])
    caja.setStyle(TableStyle([("BOX", (0, 0), (-1, -1), 1, DORADO), ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#FEF9E8")),
                              ("TOPPADDING", (0, 0), (-1, -1), 8), ("BOTTOMPADDING", (0, 0), (-1, -1), 8), ("LEFTPADDING", (0, 0), (-1, -1), 10)]))
    _, h = caja.wrap(0, 0)
    y -= 7 * mm + h
    caja.drawOn(c, M, y)
    if d.get("observaciones"):
        y = _parrafo(c, y - 7 * mm, f"<b>Observaciones:</b> {escape(d['observaciones'])}")
    _parrafo(c, y - 6 * mm, "Entrega este certificado a tu empleador. La transcripción y el pago de la prestación económica se tramitan "
                            "ante la EPS para cotizantes del régimen contributivo.", ParagraphStyle("nota", parent=TEXTO, fontSize=9, textColor=GRIS))
    _pie(c, url, d["codigo"], (d["doctor_nombre"] or "Profesional de Libitina", d["especialidad"] or ""))
    c.showPage()
    c.save()
    return buf.getvalue()
