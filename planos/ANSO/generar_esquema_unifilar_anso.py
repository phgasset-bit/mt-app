"""Genera el DXF del esquema unifilar general MT de autoconsumo S.A.T. 3043 ANSO.

Redibujado a partir del plano "ESQUEMA UNIFILAR" (Modificación caseta y
distribución de tres trafos de 1.000 kVA, Tauste, marzo 2024).

Las coordenadas se toman en píxeles de la foto del plano original y se
convierten a mm sobre un formato A3 apaisado (420 x 297).

Uso:  python generar_esquema_unifilar_anso.py [salida.dxf]
"""
import sys
from pathlib import Path

import ezdxf
from ezdxf.enums import TextEntityAlignment

SALIDA = (Path(sys.argv[1]) if len(sys.argv) > 1
          else Path(__file__).with_name("Esquema_Unifilar_General_MT_Autoconsumo_ANSO.dxf"))

ESC = 0.205  # mm por píxel de la foto


def P(x, y):
    """Píxel de la foto -> mm en el papel."""
    return (10 + (x - 58) * ESC, 10 + (1445 - y) * ESC)


doc = ezdxf.new("R2010", setup=True)
doc.units = ezdxf.units.MM
doc.header["$INSUNITS"] = 4
doc.styles.add("ARIAL", font="arial.ttf")
msp = doc.modelspace()

for nombre, color, lw in [
    ("MARCO", 7, 50), ("CAJETIN", 7, 35), ("TEXTO", 7, 18),
    ("CELDAS", 8, 25), ("BARRAS_MT", 1, 50), ("APARAMENTA", 5, 25),
    ("CABLES_MT", 1, 35), ("TRAFOS", 3, 35), ("CABLES_BT", 4, 25),
    ("TIERRA", 3, 18), ("NOTAS", 7, 18),
]:
    doc.layers.add(nombre, color=color, lineweight=lw)


# --------------------------------------------------------------- primitivas
def linea(pts, capa, cerrada=False):
    msp.add_lwpolyline([P(*p) for p in pts], close=cerrada, dxfattribs={"layer": capa})


def circulo(x, y, r_px, capa):
    msp.add_circle(P(x, y), r_px * ESC, dxfattribs={"layer": capa})


def texto(t, x, y, h=2.2, capa="TEXTO", rot=0, alin=TextEntityAlignment.LEFT):
    e = msp.add_text(t, height=h, rotation=rot, dxfattribs={"layer": capa, "style": "ARIAL"})
    e.set_placement(P(x, y), align=alin)


def flecha(x, y, hacia_abajo=True, capa="CABLES_MT", t=10):
    """Triángulo con el vértice en (x, y)."""
    d = -1 if hacia_abajo else 1
    linea([(x, y), (x - t / 2, y + d * t * 1.4), (x + t / 2, y + d * t * 1.4)], capa, True)


def flecha_izq(x, y, capa="CABLES_BT", t=8):
    linea([(x, y), (x + t * 1.4, y - t / 2), (x + t * 1.4, y + t / 2)], capa, True)


def tierra(x, y, capa="TIERRA"):
    linea([(x, y), (x, y + 8)], capa)
    for i, w in enumerate((9, 6, 3)):
        linea([(x - w, y + 8 + 4 * i), (x + w, y + 8 + 4 * i)], capa)


# ------------------------------------------------------ símbolos aparamenta
def interruptor_seccionador(x, y, largo=32):
    """Contacto abierto con cuchilla y círculo (interruptor-seccionador)."""
    linea([(x, y), (x, y + 6)], "APARAMENTA")
    linea([(x - 4, y + 6), (x + 4, y + 6)], "APARAMENTA")
    linea([(x, y + largo - 6), (x - 13, y + 9)], "APARAMENTA")
    circulo(x, y + largo - 6, 1.6, "APARAMENTA")
    linea([(x, y + largo - 6), (x, y + largo)], "APARAMENTA")
    return y + largo


def interruptor_automatico(x, y, largo=36):
    linea([(x, y), (x, y + 8)], "APARAMENTA")
    linea([(x - 4, y + 4), (x + 4, y + 12)], "APARAMENTA")
    linea([(x - 4, y + 12), (x + 4, y + 4)], "APARAMENTA")
    linea([(x, y + largo - 8), (x - 14, y + 12)], "APARAMENTA")
    linea([(x, y + largo - 8), (x, y + largo)], "APARAMENTA")
    return y + largo


def seccionador_tierra(x, y, lado=-1):
    """Derivación a tierra con seccionador desde el punto (x, y)."""
    xa = x + lado * 24
    linea([(x, y), (xa, y)], "APARAMENTA")
    linea([(xa, y), (xa, y + 4)], "APARAMENTA")
    linea([(xa, y + 20), (xa + lado * 10, y + 6)], "APARAMENTA")
    tierra(xa, y + 20)


def fusible(x, y, largo=40):
    linea([(x, y), (x, y + 6)], "APARAMENTA")
    linea([(x - 5, y + 6), (x + 5, y + 6), (x + 5, y + largo - 6), (x - 5, y + largo - 6)],
          "APARAMENTA", True)
    linea([(x, y + 6), (x, y + largo)], "APARAMENTA")
    return y + largo


def indicador_capacitivo(x, y):
    """Indicador de presencia de tensión (divisor capacitivo)."""
    linea([(x, y), (x + 10, y)], "APARAMENTA")
    linea([(x + 10, y - 7), (x + 10, y + 7)], "APARAMENTA")
    linea([(x + 15, y - 7), (x + 15, y + 7)], "APARAMENTA")
    linea([(x + 15, y), (x + 21, y)], "APARAMENTA")
    linea([(x + 21, y - 5), (x + 21, y + 5)], "APARAMENTA")


def trafo_intensidad(x, y):
    circulo(x, y, 9, "APARAMENTA")


def trafo_tension(x, y):
    circulo(x - 6, y, 9, "APARAMENTA")
    circulo(x + 6, y, 9, "APARAMENTA")


# ---------------------------------------------------------------- celdas
Y_BARRA = 410
Y_FONDO = 598


def bloque(x0, x1, divisiones):
    linea([(x0, 393), (x1, 393), (x1, 600), (x0, 600)], "CELDAS", True)
    for xd in divisiones:
        linea([(xd, 393), (xd, 600)], "CELDAS")


def barra(x0, x1):
    linea([(x0, Y_BARRA), (x1, Y_BARRA)], "BARRAS_MT")


def celda_seccionamiento(x, y_fin=Y_FONDO, flecha_salida=True):
    linea([(x, Y_BARRA), (x, 425)], "APARAMENTA")
    y = interruptor_seccionador(x, 425)
    linea([(x, y), (x, 485)], "APARAMENTA")
    seccionador_tierra(x, 470)
    indicador_capacitivo(x, 505)
    linea([(x, 485), (x, y_fin)], "APARAMENTA")
    if flecha_salida:
        flecha(x, y_fin)


def celda_prot_fusibles(x):
    linea([(x, Y_BARRA), (x, 425)], "APARAMENTA")
    y = interruptor_seccionador(x, 425)
    seccionador_tierra(x, y + 6)
    y = fusible(x, y + 12)
    # percutor del fusible -> disparo del interruptor
    linea([(x + 5, y - 20), (x + 22, y - 20), (x + 22, 440), (x + 6, 440)], "APARAMENTA")
    seccionador_tierra(x, y + 6)
    linea([(x, y), (x, Y_FONDO)], "APARAMENTA")
    indicador_capacitivo(x, 560)
    flecha(x, Y_FONDO)


def celda_prot_automatico(x0, x1):
    """Protección general con interruptor automático (en serie, forma de U)."""
    x = x0 + 30
    linea([(x0 + 2, Y_BARRA), (x, Y_BARRA), (x, 425)], "APARAMENTA")
    y = interruptor_seccionador(x, 425)
    seccionador_tierra(x, y + 6)
    y = interruptor_automatico(x, y + 14)
    seccionador_tierra(x, y + 8)
    linea([(x, y), (x, 580), (x1 - 25, 580), (x1 - 25, Y_BARRA), (x1 - 2, Y_BARRA)], "APARAMENTA")
    indicador_capacitivo(x, 560)


def celda_medida_serie(x0, x1):
    """Medida en serie: trafos de intensidad y de tensión (forma de U)."""
    xa, xb = x0 + 25, x1 - 25
    linea([(x0 + 2, Y_BARRA), (xa, Y_BARRA), (xa, 575), (xb, 575), (xb, Y_BARRA),
           (x1 - 2, Y_BARRA)], "BARRAS_MT")
    trafo_intensidad(xa, 535)
    trafo_tension(xb, 470)


def celda_medida_paso(x, x_tt, flecha_doble=False, hacia_abajo=False, con_flecha=True):
    """Medida con llegada inferior: trafo intensidad en el paso y TT en derivación."""
    linea([(x, Y_BARRA), (x, Y_FONDO)], "APARAMENTA")
    trafo_intensidad(x, 510)
    linea([(x, 440), (x_tt, 440), (x_tt, 430)], "APARAMENTA")
    trafo_tension(x_tt, 418)
    if not con_flecha:
        return
    if flecha_doble:
        flecha(x, Y_FONDO - 14, hacia_abajo=True)
        flecha(x, Y_FONDO, hacia_abajo=False)
    else:
        flecha(x, Y_FONDO, hacia_abajo=hacia_abajo)


def celda_remonte(x, hacia_abajo):
    linea([(x, Y_BARRA), (x, Y_FONDO)], "APARAMENTA")
    flecha(x, Y_FONDO, hacia_abajo=hacia_abajo)


def rotulo_celda(x, lineas):
    """Rótulos verticales encima de cada celda."""
    for i, t in enumerate(lineas):
        texto(t, x + i * 27, 375, h=2.3, rot=90)


ESPEC = "400 A , 16 kA/1s , 24 kV"

# --- Bloque cogeneración (remonte + medida)
bloque(210, 420, [315])
barra(225, 330)
celda_remonte(262, hacia_abajo=True)
celda_medida_paso(330, 395, hacia_abajo=False)
rotulo_celda(240, ["C. remonte", ESPEC])
rotulo_celda(345, ["C. medida", ESPEC])

# --- Bloque transformadores (3 protección fusibles + medida)
bloque(665, 1080, [768, 872, 975])
barra(680, 1010)
for x in (715, 820, 922):
    celda_prot_fusibles(x)
celda_medida_paso(1010, 1040, con_flecha=False)
linea([(1010, 598), (1060, 598)], "APARAMENTA")
flecha(1060, 598 - 14, hacia_abajo=True)
flecha(1060, 598, hacia_abajo=False)
for x in (690, 795, 898):
    rotulo_celda(x, ["C. prot. fusibles", ESPEC, "Fusibles 100 A"])
rotulo_celda(1000, ["C. medida", ESPEC])

# --- Bloque seccionamiento (2 celdas)
bloque(1160, 1410, [1305])
barra(1185, 1425)
celda_seccionamiento(1250, y_fin=560, flecha_salida=False)
linea([(1250, 560), (1185, 560), (1185, 598)], "APARAMENTA")
flecha(1185, 598)
celda_seccionamiento(1355, y_fin=560, flecha_salida=False)
linea([(1355, 560), (1320, 560), (1320, 598)], "APARAMENTA")
flecha(1320, 598)
rotulo_celda(1220, ["C. seccionamiento", ESPEC])
rotulo_celda(1325, ["C. seccionamiento", ESPEC])

# --- Bloque entrada compañía (medida, prot. automático, medida, secc., remonte)
cel = [1425, 1528, 1632, 1735, 1840, 1945]
bloque(cel[0], cel[-1], cel[1:-1])
celda_medida_serie(cel[0], cel[1])
celda_prot_automatico(cel[1], cel[2])
celda_medida_serie(cel[2], cel[3])
# seccionamiento en serie
xs = cel[3] + 30
linea([(cel[3] + 2, Y_BARRA), (xs, Y_BARRA), (xs, 425)], "APARAMENTA")
y = interruptor_seccionador(xs, 425)
seccionador_tierra(xs, y + 6)
indicador_capacitivo(xs, 505)
linea([(xs, y), (xs, 545), (cel[4] - 25, 545), (cel[4] - 25, Y_BARRA), (cel[4] + 2, Y_BARRA)],
      "APARAMENTA")
# remonte de entrada
linea([(cel[4] + 2, Y_BARRA), (1890, Y_BARRA), (1890, Y_FONDO)], "APARAMENTA")
flecha(1890, 598, hacia_abajo=False, t=14)
for x, nombre in zip((1455, 1555, 1660, 1760, 1865),
                     ("C. medida", "C. prot. automático", "C. medida",
                      "C. seccionamiento", "C. remonte")):
    rotulo_celda(x, [nombre, ESPEC])

# ----------------------------------------------------------- cables MT
linea([(1890, 620), (1890, 1105)], "CABLES_MT")
texto("Entrada", 1890, 1135, h=2.6, alin=TextEntityAlignment.CENTER)
linea([(1060, 600), (1060, 655), (1185, 655), (1185, 600)], "CABLES_MT")
linea([(1320, 600), (1320, 725), (330, 725), (330, 600)], "CABLES_MT")
linea([(262, 600), (262, 710), (120, 710), (120, 1255)], "CABLES_MT")
flecha(120, 1285, hacia_abajo=True, t=14)
texto("Salida", 80, 1305, h=2.6)
texto("Cogeneración", 75, 1322, h=2.6)

# ------------------------------------------------- transformadores y BT
TRAFOS = [  # (n, celda, y_trafo, x_bajada, y_quiebro)
    (3, 715, 885, 770, 685),
    (2, 820, 1015, 835, 690),
    (1, 922, 1150, 905, 690),
]
for n, xc, yt, xb, yq in TRAFOS:
    linea([(xc, 600), (xc, yq), (xb, yq), (xb, yt), (662, yt)], "CABLES_MT")
    circulo(642, yt, 20, "TRAFOS")
    circulo(612, yt, 20, "TRAFOS")
    texto(f"trafo {n}  1000 kVA", 625, yt - 66, h=1.9, alin=TextEntityAlignment.CENTER)
    texto("13200 / 400 V", 625, yt - 49, h=1.9, alin=TextEntityAlignment.CENTER)
    texto("aisl. aceite", 625, yt - 32, h=1.9, alin=TextEntityAlignment.CENTER)
    # línea BT y cuadro de salidas
    linea([(592, yt), (330, yt)], "CABLES_BT")
    texto("4(3x240)/2(240) mm2 Al XLPE 0,6/1kV", 460, yt - 8, h=1.7,
          alin=TextEntityAlignment.BOTTOM_CENTER)
    salidas = [yt - 45, yt - 20, yt + 15, yt + 40]
    linea([(330, salidas[0]), (330, salidas[-1])], "CABLES_BT")
    for ys in salidas:
        linea([(330, ys), (304, ys)], "CABLES_BT")
        linea([(277, ys - 5), (304, ys - 5), (304, ys + 5), (277, ys + 5)], "CABLES_BT", True)
        linea([(277, ys), (258, ys)], "CABLES_BT")
        flecha_izq(245, ys)
    texto("B.T.", 205, yt - 5, h=2.0)

# ------------------------------------------------------------ marco/cajetín
linea([(58, 97), (1990, 97), (1990, 1445), (58, 1445)], "MARCO", True)
CJ = "CAJETIN"
linea([(1150, 1245), (1990, 1245), (1990, 1445), (1150, 1445)], CJ, True)
linea([(1720, 1245), (1720, 1445)], CJ)
linea([(1150, 1310), (1990, 1310)], CJ)
linea([(1720, 1280), (1990, 1280)], CJ)
linea([(1790, 1245), (1790, 1310)], CJ)
linea([(1215, 1310), (1215, 1445)], CJ)
linea([(1150, 1355), (1720, 1355)], CJ)
linea([(1215, 1410), (1720, 1410)], CJ)
linea([(1345, 1355), (1345, 1445)], CJ)
linea([(1720, 1345), (1990, 1345)], CJ)

texto("CERTIFICADO DE:", 1160, 1268, h=2.1)
texto("MODIFICACION CASETA Y DISTRIBUCION", 1320, 1268, h=2.6)
texto("DE TRES TRAFOS DE 1.000 KVAS", 1320, 1297, h=2.6)
texto("FECHA", 1728, 1297, h=2.2)
texto("Marzo de 2.024", 1800, 1302, h=2.8)
texto("ESCALA", 1158, 1325, h=2.0)
texto("s/e", 1168, 1345, h=2.4)
texto("PLANO", 1222, 1325, h=2.0)
texto("ESQUEMA UNIFILAR GENERAL MT", 1468, 1342, h=3.6, alin=TextEntityAlignment.CENTER)
texto("Nº", 1158, 1372, h=2.0)
texto("PLANO", 1158, 1388, h=2.0)
texto("EMPLAZAMIENTO", 1222, 1388, h=2.0)
texto("Ctra. A-127, Km 16", 1355, 1378, h=2.4)
texto("TAUSTE, (Zaragoza)", 1355, 1400, h=2.4)
texto("TITULAR", 1222, 1432, h=2.0)
texto("S.A.T. 3043 ANSO", 1355, 1434, h=3.2)
texto("EL INGENIERO TECNICO INDUSTRIAL", 1855, 1335, h=2.1, alin=TextEntityAlignment.CENTER)
texto("GARCIA GRACIA, FRANCISCO LORENZO", 1855, 1385, h=2.0, alin=TextEntityAlignment.CENTER)
texto("(autor del plano original)", 1855, 1410, h=1.7, alin=TextEntityAlignment.CENTER)

# Nota de origen (sustituye al sello de visado, que no se reproduce)
linea([(615, 100), (1445, 100), (1445, 160), (615, 160)], "NOTAS", True)
texto("AUTOCONSUMO S.A.T. 3043 ANSO - ESQUEMA UNIFILAR GENERAL MT", 630, 122, h=2.6, capa="NOTAS")
texto("Redibujado en CAD por MNM SOLAR a partir del plano visado COGITI Aragón VIZA242020 "
      "(12/03/2024).", 630, 140, h=1.8, capa="NOTAS")
texto("Copia de trabajo: sin validez de visado ni firma. Ver original para cualquier tramitación.",
      630, 154, h=1.8, capa="NOTAS")

doc.saveas(SALIDA)
print(f"Guardado: {SALIDA}")
