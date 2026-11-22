"""Importa gritos grabados por personas reales y los convierte en las voces del juego.

Pon los audios en una carpeta (m4a, mp3, wav, ogg/opus de WhatsApp... da igual el nombre). El script:
  1. transcribe cada archivo con Whisper y lo asigna a la frase del juego que mejor encaja;
  2. si hay varias tomas de una frase, se queda con la que mejor se entiende;
  3. recorta silencios, iguala volumen y aplica un procesado suave de grito con eco de exterior;
  4. para los coros mezcla en capas todas las tomas de esa frase (de una o varias personas), con pequeños
     cambios de tono y retardo para que suene a sección entera;
  5. si solo has grabado tu voz, crea las de la escuadra (_b) desplazando el tono para que no suenen igual.
Las frases que no grabes siguen con la voz sintética.

Uso: HF_HUB_DISABLE_XET=1 python3 tools/importar_voces.py CARPETA_CON_AUDIOS [--solo-informe]
"""
import difflib, glob, os, subprocess, sys, tempfile
import numpy as np
from faster_whisper import WhisperModel

AQUI = os.path.dirname(os.path.abspath(__file__))
SALIDA = os.environ.get('SALIDA_VOCES') or os.path.join(AQUI, '..', 'www', 'audio')
FRASES = {
    'viva_espana': 'viva españa', 'viva_legion': 'viva la legión', 'a_mi': 'a mí la legión', 'adelante': 'adelante legionarios',
    'asalto': 'al asalto', 'granada': 'granada al suelo', 'recargando': 'recargando', 'tomada': 'posición tomada',
    'luchar': 'legionarios a luchar legionarios a morir', 'fuego': 'abrid fuego', 'cubridme': 'cubridme', 'enemigo': 'enemigo al frente',
    'herido': 'me han dado', 'sanitario': 'sanitario sanitario', 'aviacion': 'aviación cuerpo a tierra', 'emboscada': 'emboscada',
    'coro_viva': 'viva',
}
CORO_DE = {'coro_viva': ['coro_viva'], 'coro_espana': ['viva_espana'], 'coro_legion': ['viva_legion'], 'coro_luchar': ['luchar']}
ESCUADRA = {'viva_espana_b': 'viva_espana', 'viva_legion_b': 'viva_legion', 'a_mi_b': 'a_mi'}
RECORTE = 'silenceremove=start_periods=1:start_threshold=-40dB,areverse,silenceremove=start_periods=1:start_threshold=-40dB,areverse'
GRITO = ('highpass=f=90,afftdn=nf=-30,equalizer=f=2200:t=q:w=1.4:g=2.5,acompressor=threshold=-18dB:ratio=3:attack=8:release=120:makeup=2,'
         'aecho=0.9:0.3:45:0.1,loudnorm=I=-14:TP=-1.5')

def normal(s):
    s = s.lower()
    for a, b in zip('áéíóúü', 'aeiouu'): s = s.replace(a, b)
    return ' '.join(''.join(c if c.isalpha() or c == ' ' else ' ' for c in s).split())
def ff(args): subprocess.run(['ffmpeg', '-v', 'error', '-y'] + args, check=True)

def main():
    if len(sys.argv) < 2: print(__doc__); return
    carpeta, solo = sys.argv[1], '--solo-informe' in sys.argv
    modelo = WhisperModel('small', device='cpu', compute_type='int8')
    tmp = tempfile.mkdtemp()
    tomas = {}  # clave -> [(nota, wav, texto)]
    archivos = sorted(f for f in glob.glob(os.path.join(carpeta, '**', '*'), recursive=True) if os.path.isfile(f))
    for i, f in enumerate(archivos):
        wav = os.path.join(tmp, f'{i}.wav')
        try: ff(['-i', f, '-ac', '1', '-ar', '44100', '-af', RECORTE, wav])
        except subprocess.CalledProcessError: print('no es audio:', f); continue
        raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', wav, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'], capture_output=True).stdout
        a = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
        texto = ' '.join(s.text.strip() for s in modelo.transcribe(a, language='es', beam_size=3)[0])
        notas = {k: difflib.SequenceMatcher(None, normal(texto), normal(v)).ratio() for k, v in FRASES.items()}
        clave = max(notas, key=notas.get)
        if notas[clave] < 0.6: print(f'sin asignar ({notas[clave]:.2f}): {os.path.basename(f)} -> «{texto}»'); continue
        tomas.setdefault(clave, []).append((notas[clave], wav, texto))
        print(f'{os.path.basename(f):30s} -> {clave:12s} {notas[clave]:.2f}  «{texto}»')
    if solo: return
    hechas = []
    for clave, lista in tomas.items():
        n, wav, texto = max(lista)
        ff(['-i', wav, '-af', GRITO, '-ac', '1', '-b:a', '96k', os.path.join(SALIDA, clave + '.mp3')]); hechas.append(clave)
    for b, origen in ESCUADRA.items():  # la escuadra: otra toma si la hay, o tu voz con otro tono
        if origen not in tomas: continue
        lista = sorted(tomas[origen], reverse=True); wav = (lista[1] if len(lista) > 1 else lista[0])[1]
        tono = 1.0 if len(lista) > 1 else 0.9
        ff(['-i', wav, '-af', f'rubberband=pitch={tono}:formant=preserved,' + GRITO, '-ac', '1', '-b:a', '96k', os.path.join(SALIDA, b + '.mp3')]); hechas.append(b)
    for coro, fuentes in CORO_DE.items():  # coros: todas las tomas en capas
        capas = [w for k in fuentes for (_, w, _) in tomas.get(k, [])]
        if not capas: continue
        while len(capas) < 6: capas = capas + capas
        capas = capas[:9]; entradas, fc, mezcla = [], '', ''
        for i, w in enumerate(capas):
            tono = [1.0, 0.94, 1.06, 0.9, 1.1, 0.97, 1.03, 0.92, 1.08][i]
            entradas += ['-i', w]; fc += f'[{i}]rubberband=pitch={tono}:formant=preserved,adelay={(i * 37) % 160},volume=0.7[v{i}];'; mezcla += f'[v{i}]'
        ff(entradas + ['-filter_complex', fc + mezcla + f'amix=inputs={len(capas)}:normalize=0,highpass=f=90,acompressor=threshold=-20dB:ratio=3:attack=10:release=150:makeup=2,aecho=0.85:0.4:70|170:0.2|0.1,loudnorm=I=-14:TP=-1.5', '-ac', '1', '-b:a', '96k', os.path.join(SALIDA, coro + '.mp3')])
        hechas.append(coro)
    faltan = sorted(set(FRASES) | set(ESCUADRA) | set(CORO_DE) - set(hechas))
    print('\nCon tu voz:', ', '.join(sorted(set(hechas))))
    print('Siguen con voz sintética:', ', '.join(k for k in faltan if k not in hechas) or 'ninguna')

main()
