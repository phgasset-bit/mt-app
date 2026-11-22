// Genera los iconos de la app: bandera de España ondeando (fondo) y emblema legionario (primer plano).
// Salida: recursos/android/res/mipmap-*/ (icono adaptativo + versiones clásicas) y recursos/icono-512.png (Google Play).
// Uso: node tools/gen_iconos.js   (requiere Playwright con Chromium)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const RAIZ = path.join(__dirname, '..', 'recursos');

const BANDERA = `
  <defs>
    <linearGradient id="luz" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".28"/></linearGradient>
    <radialGradient id="vin" cx=".5" cy=".5" r=".72"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".45"/></radialGradient>
  </defs>
  <rect width="108" height="108" fill="#aa151b"/>
  <path d="M-4 30 C 18 22, 36 38, 56 30 S 92 22, 112 30 L112 80 C 92 72, 74 88, 56 80 S 18 72, -4 80 Z" fill="#f1bf00"/>
  <path d="M-4 30 C 18 22, 36 38, 56 30 S 92 22, 112 30" fill="none" stroke="#7d0f13" stroke-opacity=".35" stroke-width="1.2"/>
  <path d="M-4 80 C 18 72, 36 88, 56 80 S 92 72, 112 80" fill="none" stroke="#7d0f13" stroke-opacity=".35" stroke-width="1.2"/>
  <path d="M0 0 C 20 6, 30 50, 54 54 S 90 100, 108 108 L108 0 Z" fill="#000" opacity=".08"/>
  <rect width="108" height="108" fill="url(#luz)"/><rect width="108" height="108" fill="url(#vin)"/>`;

// emblema: alabarda, arcabuz y ballesta cruzados bajo corona (dibujo propio)
const FORMAS = `<path d="M62 54 L68 26 L84 42 L100 16 L116 42 L132 26 L138 54 Z"/><rect x="58" y="54" width="84" height="11" rx="2"/>
  <circle cx="68" cy="22" r="5"/><circle cx="100" cy="12" r="5"/><circle cx="132" cy="22" r="5"/>
  <path d="M150 86 Q176 86 180 112 L160 102 Z"/><path d="M161 79 L176 60 L169 84 Z"/><path d="M151 199 L172 221 L160 229 L139 208 Z"/><rect x="94" y="208" width="12" height="16" rx="2"/>`;
const TRAZOS = `<line x1="40" y1="216" x2="162" y2="80"/><line x1="146" y1="200" x2="36" y2="80"/><line x1="100" y1="98" x2="100" y2="214"/><path d="M44 124 Q100 84 156 124"/><path d="M44 124 L100 146 L156 124" stroke-width="7"/>`;
// el emblema ocupa la zona segura del icono adaptativo (66 dp centrales de 108)
const EMBLEMA = `
  <defs><filter id="sombra" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="1.6" stdDeviation="1.6" flood-color="#000" flood-opacity=".55"/></filter></defs>
  <g transform="translate(26 20) scale(0.28)" filter="url(#sombra)">
    <g fill="#e8b923" stroke="#e8b923" stroke-width="28" stroke-linejoin="round" stroke-linecap="round">${FORMAS}<g fill="none">${TRAZOS}</g></g>
    <g fill="#1b0f06" stroke="#1b0f06" stroke-width="14" stroke-linejoin="round" stroke-linecap="round">${FORMAS}<g fill="none">${TRAZOS}</g></g>
    <g fill="none" stroke="#5a3a12" stroke-width="2.5" stroke-linecap="round" opacity=".9">${TRAZOS}</g>
  </g>`;

let nc = 0;
const svg = (contenido, forma) => { const id = 'c' + (nc++); return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 108 108" width="100%" height="100%">
  ${forma ? `<defs><clipPath id="${id}">${forma}</clipPath></defs><g clip-path="url(#${id})">${contenido}</g>` : contenido}</svg>`; };
const CUADRADO = '<rect x="9" y="9" width="90" height="90" rx="20"/>', CIRCULO = '<circle cx="54" cy="54" r="45"/>';
// versión clásica: recorta el centro (90 de 108) para que el emblema quede grande
const clasico = (forma) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="9 9 90 90" width="100%" height="100%"><defs><clipPath id="c">${forma}</clipPath></defs><g clip-path="url(#c)">${BANDERA}${EMBLEMA}</g></svg>`;

const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  async function png(contenido, px, archivo, transparente) {
    await p.setViewportSize({ width: px, height: px });
    await p.setContent(`<html><body style="margin:0;background:${transparente ? 'transparent' : '#000'}">${contenido}</body></html>`);
    fs.mkdirSync(path.dirname(archivo), { recursive: true });
    await p.screenshot({ path: archivo, omitBackground: !!transparente });
  }
  for (const [d, k] of Object.entries(DENS)) {
    const dir = path.join(RAIZ, 'android', 'res', 'mipmap-' + d);
    await png(svg(BANDERA), Math.round(108 * k), path.join(dir, 'ic_launcher_background.png'));
    await png(svg(EMBLEMA), Math.round(108 * k), path.join(dir, 'ic_launcher_foreground.png'), true);
    await png(clasico(CUADRADO), Math.round(48 * k), path.join(dir, 'ic_launcher.png'), true);
    await png(clasico(CIRCULO), Math.round(48 * k), path.join(dir, 'ic_launcher_round.png'), true);
  }
  const v26 = path.join(RAIZ, 'android', 'res', 'mipmap-anydpi-v26'); fs.mkdirSync(v26, { recursive: true });
  const xml = `<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n    <background android:drawable="@mipmap/ic_launcher_background"/>\n    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n`;
  fs.writeFileSync(path.join(v26, 'ic_launcher.xml'), xml); fs.writeFileSync(path.join(v26, 'ic_launcher_round.xml'), xml);
  // icono de la ficha de Google Play: 512x512, sin transparencia (Google redondea las esquinas)
  await png(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="9 9 90 90" width="100%" height="100%">${BANDERA}${EMBLEMA}</svg>`, 512, path.join(RAIZ, 'icono-512.png'));
  // muestra para revisar: tres formas de recorte
  await p.setViewportSize({ width: 760, height: 260 });
  await p.setContent(`<html><body style="margin:0;background:#2b2b2b;display:flex;gap:40px;align-items:center;justify-content:center;height:260px">
    ${[CIRCULO, CUADRADO, '<path d="M54 9 C 85 9 99 23 99 54 S 85 99 54 99 S 9 85 9 54 S 23 9 54 9 Z"/>'].map(f => `<div style="width:200px;height:200px">${svg(BANDERA + EMBLEMA, f)}</div>`).join('')}</body></html>`);
  await p.screenshot({ path: path.join(RAIZ, 'muestra-iconos.png') });
  await b.close(); console.log('iconos generados en', RAIZ);
})();
