# Genera dist/index.html: versión de una sola página para jugar en el navegador (three.js desde CDN, JS en línea).
import re, pathlib, shutil
raiz = pathlib.Path(__file__).resolve().parent.parent
www = raiz / 'www'; dist = raiz / 'dist'; dist.mkdir(exist_ok=True)
s = (www / 'index.html').read_text()
s = re.sub(r'<!doctype html>\s*<html[^>]*>\s*<head>\s*<meta charset="utf-8">\s*', '', s)
s = s.replace('</head>\n<body>\n', '').replace('</body>\n</html>\n', '')
s = re.sub(r'<meta name="viewport"[^>]*>\n', '', s)
s = s.replace('<script src="lib/three.min.js"></script>', '<script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>')
for m in re.findall(r'<script src="js/([a-z]+)\.js"></script>', s):
    s = s.replace(f'<script src="js/{m}.js"></script>', '<script>\n' + (www / 'js' / f'{m}.js').read_text() + '\n</script>')
assert 'src="js/' not in s, 'quedan scripts sin incrustar'
(dist / 'index.html').write_text(s)
if (dist / 'audio').exists(): shutil.rmtree(dist / 'audio')
shutil.copytree(www / 'audio', dist / 'audio')
if (dist / 'modelos').exists(): shutil.rmtree(dist / 'modelos')
shutil.copytree(www / 'modelos', dist / 'modelos')
print('dist/index.html', len(s) // 1024, 'KB')
