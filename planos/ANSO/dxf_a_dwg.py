"""Convierte un DXF (generado con ezdxf) a DWG R2000 usando LibreDWG.

DWG es un formato binario cerrado de Autodesk. LibreDWG (GNU) lo implementa por
ingeniería inversa; su conversor dxf2dwg deja referencias duplicadas en las
tablas, así que el DWG se pasa por JSON, se limpia y se reescribe con dwgwrite.

Requiere los binarios de LibreDWG (dxf2dwg, dwgread, dwgwrite) en el PATH o en
la carpeta indicada con LIBREDWG_BIN.

Uso:  python dxf_a_dwg.py entrada.dxf [salida.dwg]
"""
import json
import math
import os
import subprocess
import sys
import tempfile
from pathlib import Path

import ezdxf


def herramienta(nombre):
    carpeta = os.environ.get("LIBREDWG_BIN")
    return str(Path(carpeta) / nombre) if carpeta else nombre


def ejecutar(*args):
    subprocess.run(args, check=True, capture_output=True)


def datos_textos(doc):
    """Giro y alineación de cada TEXT, que dxf2dwg no importa."""
    textos = {}
    for t in doc.modelspace().query("TEXT"):
        textos.setdefault(t.dxf.text, []).append({
            "ins_pt": list(t.dxf.insert)[:2],
            "alignment_pt": list(t.dxf.get("align_point", t.dxf.insert))[:2],
            "rotation": math.radians(t.dxf.rotation),
            "horiz_alignment": t.dxf.halign,
            "vert_alignment": t.dxf.valign,
        })
    return textos


# Grosores DXF (centésimas de mm) -> índice de grosor en DWG
GROSORES = [0, 5, 9, 13, 15, 18, 20, 25, 30, 35, 40, 50, 53, 60, 70, 80, 90, 100, 106,
            120, 140, 158, 200, 211]


def restaurar_grosores(datos, doc):
    """dxf2dwg tampoco importa el grosor de línea de las capas."""
    grosor = {c.dxf.name: c.dxf.get("lineweight", -3) for c in doc.layers}
    for o in datos["OBJECTS"]:
        if o.get("object") == "LAYER" and o["name"] in grosor:
            g = grosor[o["name"]]
            indice = GROSORES.index(g) if g in GROSORES else 31  # 31 = por defecto
            o["linewt"] = indice
            # en R2000+ el grosor va en los bits 5-9 de flag0
            o["flag0"] = (o.get("flag0", 0) & ~0x03E0) | (indice << 5)


def restaurar_textos(datos, textos):
    for o in datos["OBJECTS"]:
        if o.get("entity") == "TEXT" and textos.get(o["text_value"]):
            o.update(textos[o["text_value"]].pop(0))
            o["dataflags"] = 0  # todos los campos opcionales presentes


def limpiar(datos):
    objetos = datos["OBJECTS"]
    control = next(o for o in objetos if o.get("object") == "BLOCK_CONTROL")
    especiales = {control["model_space"][-1], control["paper_space"][-1]}
    # dxf2dwg crea un segundo *Model_Space vacío que choca con otro handle
    objetos[:] = [
        o for o in objetos
        if not (o.get("object") == "BLOCK_HEADER" and o.get("name") == "*Model_Space"
                and o["handle"][-1] not in especiales)
    ]
    handles = {o["handle"][-1] for o in objetos}
    for o in objetos:
        if not str(o.get("object", "")).endswith("_CONTROL") or "entries" not in o:
            continue
        vistos = []
        for e in o["entries"]:
            h = e[-1]
            if h and h in handles and e not in vistos:
                if o["object"] == "BLOCK_CONTROL" and h in especiales:
                    continue
                vistos.append(e)
        o["entries"] = vistos
        if "num_entries" in o:
            o["num_entries"] = len(vistos)


def convertir(dxf, dwg):
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        doc = ezdxf.readfile(dxf)
        doc.dxfversion = "AC1015"  # R2000: la versión que LibreDWG escribe de forma nativa
        doc.saveas(tmp / "r2000.dxf")
        ejecutar(herramienta("dxf2dwg"), "-y", "-o", str(tmp / "bruto.dwg"), str(tmp / "r2000.dxf"))
        ejecutar(herramienta("dwgread"), "-O", "JSON", "-o", str(tmp / "bruto.json"),
                 str(tmp / "bruto.dwg"))
        datos = json.loads((tmp / "bruto.json").read_text())
        limpiar(datos)
        restaurar_textos(datos, datos_textos(doc))
        restaurar_grosores(datos, doc)
        (tmp / "limpio.json").write_text(json.dumps(datos))
        ejecutar(herramienta("dwgwrite"), "-y", "--as", "r2000", "-o", str(dwg),
                 str(tmp / "limpio.json"))
    print(f"Guardado: {dwg}")


if __name__ == "__main__":
    entrada = Path(sys.argv[1])
    salida = Path(sys.argv[2]) if len(sys.argv) > 2 else entrada.with_suffix(".dwg")
    convertir(entrada, salida)
