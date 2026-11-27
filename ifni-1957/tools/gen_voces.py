"""Genera los gritos del juego con voces neuronales Piper y elige la mejor toma de cada uno.

Para cada frase se sintetizan varias tomas (Piper varía la entonación en cada una), se transcriben con
Whisper y se queda la que mejor se entiende. Después se aplica un procesado suave de grito (algo más de tono
conservando el timbre, presencia, compresión y eco de exterior) y se vuelve a comprobar.

Modelos en tools/voices/ (Hugging Face, rhasspy/piper-voices):
  es_ES-davefx-medium      voz del jugador
  es_ES-sharvard-medium    hablante 0, voz de la escuadra
  es_MX-ald-medium         solo para dar cuerpo a los coros
Requisitos: pip install piper-tts faster-whisper; ffmpeg con rubberband.
Uso: HF_HUB_DISABLE_XET=1 python3 tools/gen_voces.py [clave ...]
"""
import difflib, os, random, subprocess, sys, tempfile
import numpy as np
from faster_whisper import WhisperModel

AQUI = os.path.dirname(os.path.abspath(__file__))
VOCES = os.path.join(AQUI, 'voices')
SALIDA = os.path.join(AQUI, '..', 'www', 'audio')
DAVE, SHAR, ALD = 'es_ES-davefx-medium', 'es_ES-sharvard-medium', 'es_MX-ald-medium'
RECORTE = 'silenceremove=start_periods=1:start_threshold=-42dB,areverse,silenceremove=start_periods=1:start_threshold=-42dB,areverse'
def grito(tono):
    return (RECORTE + f',aresample=44100,rubberband=pitch={tono}:formant=preserved,highpass=f=100,'
            'equalizer=f=2000:t=q:w=1.5:g=3,acompressor=threshold=-20dB:ratio=3:attack=10:release=120:makeup=3,'
            'aecho=0.9:0.3:45:0.12,loudnorm=I=-14:TP=-1.5')

# clave, voz, texto que se sintetiza, texto esperado (para puntuar), tono del grito
SOLOS = [
    ('viva_espana', DAVE, '¡Viva España!', 'viva españa', 1.06),
    ('viva_legion', DAVE, '¡Viva la Legión!', 'viva la legión', 1.06),
    ('a_mi', DAVE, '¡A mí la Legión!', 'a mí la legión', 1.07),
    ('adelante', DAVE, '¡Adelante, legionarios!', 'adelante legionarios', 1.05),
    ('asalto', DAVE, '¡Al asalto!', 'al asalto', 1.07),
    ('granada', DAVE, '¡Granada! ¡Al suelo!', 'granada al suelo', 1.05),
    ('recargando', DAVE, '¡Recargando!', 'recargando', 1.03),
    ('luchar', DAVE, '¡Legionarios, a luchar! ¡Legionarios, a morir!', 'legionarios a luchar legionarios a morir', 1.05),
    ('tomada', DAVE, '¡Posición tomada!', 'posición tomada', 1.05),
    ('viva_espana_b', SHAR, '¡Viva España!', 'viva españa', 1.06),
    ('viva_legion_b', SHAR, '¡Viva la Legión!', 'viva la legión', 1.06),
    ('a_mi_b', SHAR, '¡A mí la Legión!', 'a mí la legión', 1.07),
    ('fuego', SHAR, '¡Abrid fuego!', 'abrid fuego', 1.05),
    ('cubridme', SHAR, '¡Cubridme, cubridme!', 'cubridme cubridme', 1.05),
    ('enemigo', SHAR, '¡Enemigo al frente!', 'enemigo al frente', 1.04),
    ('herido', SHAR, '¡Ay! ¡Me han dado!', 'ay me han dado', 1.02),
    ('sanitario', SHAR, '¡Sanitario! ¡Sanitario!', 'sanitario sanitario', 1.05),
    ('aviacion', SHAR, '¡Aviación! ¡Cuerpo a tierra!', 'aviación cuerpo a tierra', 1.04),
    ('emboscada', SHAR, '¡Emboscada!', 'emboscada', 1.06),
]
COROS = [
    ('coro_viva', '¡Viva!', 'viva'),
    ('coro_espana', '¡Viva España!', 'viva españa'),
    ('coro_legion', '¡Viva la Legión!', 'viva la legión'),
    ('coro_luchar', '¡Legionarios, a luchar! ¡Legionarios, a morir!', 'legionarios a luchar legionarios a morir'),
]

modelo = WhisperModel('small', device='cpu', compute_type='int8')
tmp = tempfile.mkdtemp()

def normal(s):
    s = s.lower()
    for a, b in zip('áéíóúü', 'aeiouu'): s = s.replace(a, b)
    return ' '.join(''.join(c if c.isalpha() or c == ' ' else ' ' for c in s).split())
def oir(ruta):
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', ruta, '-f', 's16le', '-ac', '1', '-ar', '16000', '-'], capture_output=True).stdout
    a = np.frombuffer(raw, dtype=np.int16).astype(np.float32) / 32768
    return ' '.join(s.text.strip() for s in modelo.transcribe(a, language='es', beam_size=3)[0])
def nota(oido, esperado): return difflib.SequenceMatcher(None, normal(oido), normal(esperado)).ratio()
def sintetiza(voz, texto, ruta, largo):
    subprocess.run(f"echo '{texto}' | python3 -m piper -m {VOCES}/{voz}.onnx -s 0 -f {ruta} --length-scale {largo} --noise-scale 0.667 --noise-w-scale 0.8 2>/dev/null", shell=True, check=True)
def mejor_toma(voz, texto, esperado, n=8):
    tomas = []
    for i in range(n):
        ruta = os.path.join(tmp, f'{voz}_{i}.wav')
        sintetiza(voz, texto, ruta, random.uniform(0.92, 1.08))
        oido = oir(ruta); tomas.append((nota(oido, esperado), ruta, oido))
        if tomas[-1][0] >= 0.97: break
    return max(tomas)
def ffmpeg(args): subprocess.run(['ffmpeg', '-v', 'error', '-y'] + args, check=True)

def guarda_si_mejora(destino, esperado):
    final, nuevo = destino
    oido = oir(nuevo); n = nota(oido, esperado)
    if os.path.exists(final) and not os.environ.get('FORZAR'):
        viejo = oir(final)
        if nota(viejo, esperado) >= n: return (round(nota(viejo, esperado), 2), viejo + '  (se conserva la anterior)')
    os.replace(nuevo, final)
    return (round(n, 2), oido)

filtro = set(sys.argv[1:])
informe = []
for clave, voz, texto, esperado, tono in SOLOS:
    if filtro and clave not in filtro: continue
    n, ruta, oido = mejor_toma(voz, texto, esperado)
    destino = os.path.join(SALIDA, clave + '.mp3'), os.path.join(tmp, clave + '.mp3')
    ffmpeg(['-i', ruta, '-af', grito(tono), '-ac', '1', '-b:a', '96k', destino[1]])
    informe.append((clave, round(n, 2)) + guarda_si_mejora(destino, esperado))

# coro: la mejor toma de cada voz, en capas con pequeñas variaciones de tono, tempo y retardo
CAPAS = [(DAVE, 1.06, 1.00, 0), (DAVE, 1.00, 0.97, 70), (DAVE, 1.12, 1.03, 140), (SHAR, 1.08, 1.00, 30), (SHAR, 1.02, 1.03, 105),
         (SHAR, 1.14, 0.97, 170), (ALD, 0.98, 1.00, 55), (ALD, 1.06, 1.04, 120)]
for clave, texto, esperado in COROS:
    if filtro and clave not in filtro: continue
    tomas = {v: mejor_toma(v, texto, esperado, 4)[1] for v in (DAVE, SHAR, ALD)}
    entradas, fc, mezcla = [], '', ''
    for i, (v, tono, tempo, retardo) in enumerate(CAPAS):
        entradas += ['-i', tomas[v]]
        fc += f'[{i}]{RECORTE},aresample=44100,rubberband=pitch={tono}:tempo={tempo}:formant=preserved,adelay={retardo},volume={0.55 + (i % 3) * 0.1:.2f}[v{i}];'
        mezcla += f'[v{i}]'
    destino = os.path.join(SALIDA, clave + '.mp3'), os.path.join(tmp, clave + '.mp3')
    ffmpeg(entradas + ['-filter_complex', fc + mezcla + f'amix=inputs={len(CAPAS)}:normalize=0,highpass=f=100,equalizer=f=2000:t=q:w=1.5:g=3,'
           'acompressor=threshold=-20dB:ratio=3:attack=10:release=150:makeup=2,aecho=0.85:0.4:70|170:0.2|0.1,loudnorm=I=-14:TP=-1.5',
           '-ac', '1', '-b:a', '96k', destino[1]])
    informe.append((clave, '-') + guarda_si_mejora(destino, esperado))

print(f"{'clave':16s} {'toma':>5s} {'final':>5s}  lo que entiende Whisper")
for c, a, b, t in informe: print(f'{c:16s} {a!s:>5s} {b!s:>5s}  {t}')
