// Menús: campaña, armería, hoja de servicios, ranking, tienda, fin de misión y diálogos.
const UI = (() => {
  const $ = id => document.getElementById(id);
  const fmt = n => Math.round(n).toLocaleString('es-ES');
  let alJugar = () => {};
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function confirmar(tit, txt, ok, no) {
    return new Promise(res => {
      $('mTit').textContent = tit; $('mTxt').textContent = txt; $('mOk').textContent = ok || 'Aceptar'; $('mNo').textContent = no || 'Cancelar';
      $('modal').hidden = false;
      $('mOk').onclick = () => { $('modal').hidden = true; res(true); };
      $('mNo').onclick = () => { $('modal').hidden = true; res(false); };
    });
  }
  let toastT = null;
  function toast(txt) { const t = $('toast'); t.textContent = txt; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, 2600); }

  function cabecera() {
    const P = Progreso.P, r = Progreso.rango(), R = Progreso.RANGOS, sig = R[r + 1];
    const pct = sig ? (P.xp - R[r].xp) / (sig.xp - R[r].xp) * 100 : 100;
    $('perfil').innerHTML = Progreso.insignia(r, 34) +
      '<div class="pf-txt"><b>' + R[r].nom + (P.avatar.nombre ? ' ' + esc(P.avatar.nombre) : '') + '</b><span>' + fmt(P.xp) + (sig ? ' / ' + fmt(sig.xp) + ' pts de servicio' : ' pts · rango máximo') + '</span><div class="barra"><i style="width:' + pct + '%"></i></div></div>' +
      '<div class="monedas"><span title="Pesetas">₧ ' + fmt(P.pts) + '</span><span class="oro" title="Oro">◆ ' + fmt(P.oro) + '</span></div>';
  }

  function tab(nombre) {
    document.querySelectorAll('.pestanas button').forEach(b => b.classList.toggle('on', b.dataset.tab === nombre));
    ['campana', 'avatar', 'armeria', 'hoja', 'ranking', 'tienda'].forEach(t => $('tab-' + t).hidden = t !== nombre);
    Avatar.activo = nombre === 'avatar';
    ({ campana, avatar, armeria, hoja, ranking, tienda })[nombre]();
    cabecera();
  }

  function campana() {
    const l = $('tab-campana'); l.innerHTML = '';
    const P = Progreso.P;
    MISIONES.forEach((m, i) => {
      const b = document.createElement('button'); b.className = 'mis'; b.type = 'button'; b.id = 'mis-' + m.id;
      b.innerHTML = '<span class="mis-n">' + (i < 5 ? 'Misión ' + (i + 1) : 'Epílogo') + (P.hechas[m.id] ? ' · cumplida' : '') + '</span>' + esc(m.tit) + '<small>' + esc(m.dato) + '</small>' + (P.mejor[m.id] ? '<small class="mejor">Mejor marca: ' + fmt(P.mejor[m.id]) + '</small>' : '');
      b.onclick = () => alJugar(i); l.appendChild(b);
    });
  }

  // ---------- Mi legionario ----------
  function avatar() {
    const P = Progreso.P, A = Avatar.COSMETICOS, r = Progreso.rango(), R = Progreso.RANGOS;
    const nombres = { tocado: 'Tocado', camisa: 'Uniforme', barba: 'Barba', panuelo: 'Pañuelo' };
    let h = '<div class="avatar-grid"><div class="visor"><canvas id="avCanvas"></canvas><div class="fila visor-bt"><button type="button" class="mini" data-enf="cuerpo">Cuerpo</button><button type="button" class="mini" data-enf="cara">Cara</button></div></div><div class="av-opc">';
    h += '<label class="ajuste" for="avNombre">Apellido <input id="avNombre" maxlength="16" placeholder="Por ejemplo, Millán" value="' + esc(P.avatar.nombre) + '"></label>';
    h += '<div class="av-fila"><span>Piel</span>' + Avatar.PIEL.map((c, i) => '<button type="button" class="muestra' + (P.avatar.piel === i ? ' on' : '') + '" data-piel="' + i + '" style="background:#' + c.toString(16).padStart(6, '0') + '" aria-label="Tono ' + (i + 1) + '"></button>').join('') + '</div>';
    h += '<div class="av-fila"><span>Pelo</span>' + Avatar.PELO.map((c, i) => '<button type="button" class="muestra' + (P.avatar.pelo === i ? ' on' : '') + '" data-pelo="' + i + '" style="background:#' + c.toString(16).padStart(6, '0') + '" aria-label="Color ' + (i + 1) + '"></button>').join('') + '</div>';
    for (const cat in A) {
      h += '<div class="av-cat"><span>' + nombres[cat] + '</span><div class="chips">';
      for (const id in A[cat]) {
        const o = A[cat][id], tiene = P.cosmeticos[cat + ':' + id], puesto = P.avatar[cat] === id, bloq = o.rango && r < o.rango;
        let etiqueta = o.nom;
        if (!tiene) etiqueta += bloq ? ' · ' + R[o.rango].nom : o.oro ? ' · ◆ ' + o.oro : ' · ₧ ' + fmt(o.pts);
        h += '<button type="button" class="opc' + (puesto ? ' on' : '') + (o.oro && !tiene ? ' oro' : '') + '" data-cat="' + cat + '" data-id="' + id + '"' + (bloq && !tiene ? ' disabled' : '') + '>' + etiqueta + '</button>';
      }
      h += '</div></div>';
    }
    const her = Object.keys(Avatar.HERIDAS).filter(k => P.heridas[k]);
    h += '<div class="av-cat"><span>Heridas de guerra</span>' + (her.length ? '<ul class="heridas">' + her.map(k => '<li><b>' + Avatar.HERIDAS[k].nom + '</b> · ' + Avatar.HERIDAS[k].txt + '</li>').join('') + '</ul><label class="ajuste" for="avHer">Mostrar las heridas en mi legionario <input type="checkbox" id="avHer"' + (P.mostrarHeridas ? ' checked' : '') + '></label>' : '<p class="nota">Ninguna todavía. Quien sale de una misión con menos de 25 de salud, o vuelve al combate tras caer, puede quedar marcado: parche en el ojo, cicatriz o cabeza vendada.</p>') + '</div>';
    h += '<p class="nota">Las medallas que ganes aparecen como pasadores en el pecho y el tatuaje en el antebrazo izquierdo.</p></div></div>';
    const el = $('tab-avatar'); el.innerHTML = h;
    Avatar.montar($('avCanvas'));
    const refresca = () => { Progreso.guardar(); Avatar.actualizar(); };
    $('avNombre').oninput = e => { P.avatar.nombre = e.target.value.trim(); Progreso.guardar(); cabecera(); };
    $('avHer') && ($('avHer').onchange = e => { P.mostrarHeridas = e.target.checked; refresca(); });
    el.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
      if (d.enf) { Avatar.enfoque = d.enf; return; }
      if (d.piel) { P.avatar.piel = +d.piel; refresca(); avatar(); return; }
      if (d.pelo) { P.avatar.pelo = +d.pelo; refresca(); avatar(); return; }
      if (d.cat) {
        const o = A[d.cat][d.id], k = d.cat + ':' + d.id;
        if (!P.cosmeticos[k]) {
          if (o.oro) { if (P.oro < o.oro) { tab('tienda'); toast('Te falta oro'); return; } if (!(await confirmar('Comprar con oro', o.nom + ' por ' + o.oro + ' de oro.', 'Comprar'))) return; }
          if (!Progreso.gastar(o.pts || 0, o.oro || 0)) { toast('Te faltan pesetas'); return; }
          P.cosmeticos[k] = 1; toast('Comprado: ' + o.nom);
        }
        P.avatar[d.cat] = d.id; refresca(); avatar(); cabecera();
      }
    };
  }

  function barras(a) {
    const b = (n, v) => '<div class="st"><span>' + n + '</span><div class="barra"><i style="width:' + Math.min(100, v) + '%"></i></div></div>';
    return b('Daño', a.dmg / 1.2) + b('Cadencia', a.auto ? 100 - a.cad * 300 : 15) + b('Precisión', 100 - a.disp * 1300) + b('Cargador', a.carg * 3);
  }
  function armeria() {
    const P = Progreso.P, A = Progreso.ARMAS, T = Progreso.TATUAJES, R = Progreso.RANGOS, r = Progreso.rango();
    let h = '<h3>Armas</h3><p class="nota">Llevas dos armas: principal y secundaria (botón ARMA para cambiar). Se desbloquean al subir de empleo; con oro puedes adelantarte.</p><div class="cartas">';
    for (const id in A) {
      const a = A[id], tiene = P.armas[id], eq = P.equipo.p === id ? 'Principal' : P.equipo.s === id ? 'Secundaria' : '';
      h += '<div class="carta' + (eq ? ' eq' : '') + '"><b>' + esc(a.nom) + '</b><small>' + esc(a.desc) + '</small>' + barras(a) + '<div class="acc">';
      if (tiene) {
        h += eq ? '<span class="chip">' + eq + '</span>' : '';
        if (P.equipo.p !== id) h += '<button type="button" class="mini" data-eq="p" data-id="' + id + '">Principal</button>';
        if (P.equipo.s !== id && P.equipo.p !== id) h += '<button type="button" class="mini" data-eq="s" data-id="' + id + '">Secundaria</button>';
      } else {
        if (r >= a.rango) h += '<button type="button" class="mini" data-buy="' + id + '" data-pts="' + a.pts + '">₧ ' + fmt(a.pts) + '</button>';
        else h += '<span class="chip gris">Requiere ' + R[a.rango].nom + '</span>';
        h += '<button type="button" class="mini oro" data-buyoro="' + id + '" data-oro="' + a.oro + '">◆ ' + a.oro + '</button>';
      }
      h += '</div></div>';
    }
    h += '</div><h3>Tatuajes</h3><p class="nota">Se ven en tu antebrazo mientras combates.</p><div class="cartas">';
    for (const id in T) {
      const t = T[id], tiene = P.tatuajes[id], eq = P.equipo.tat === id, bloq = t.rango && r < t.rango;
      h += '<div class="carta tat' + (eq ? ' eq' : '') + '"><canvas width="120" height="90" data-tat="' + id + '"></canvas><b>' + esc(t.nom) + '</b><div class="acc">';
      if (tiene) h += eq ? '<span class="chip">Puesto</span>' : '<button type="button" class="mini" data-tateq="' + id + '">Ponérmelo</button>';
      else if (bloq) h += '<span class="chip gris">Requiere ' + R[t.rango].nom + '</span>';
      else h += '<button type="button" class="mini' + (t.oro ? ' oro' : '') + '" data-tatbuy="' + id + '">' + (t.oro ? '◆ ' + t.oro : '₧ ' + fmt(t.pts)) + '</button>';
      h += '</div></div>';
    }
    h += '</div>';
    const el = $('tab-armeria'); el.innerHTML = h;
    el.querySelectorAll('canvas[data-tat]').forEach(c => { const g = c.getContext('2d'); g.fillStyle = '#c8996f'; g.fillRect(0, 0, 120, 90); Progreso.dibujaTatuaje(c.dataset.tat, g, 60, 45, 1); });
    el.onclick = async e => {
      const b = e.target.closest('button'); if (!b) return;
      const d = b.dataset;
      if (d.eq) { if (d.eq === 'p') { if (P.equipo.s === d.id) P.equipo.s = P.equipo.p; P.equipo.p = d.id; } else P.equipo.s = d.id; Progreso.guardar(); armeria(); toast('Equipo actualizado'); }
      else if (d.buy) { if (Progreso.gastar(+d.pts, 0)) { P.armas[d.buy] = 1; if (!P.equipo.s) P.equipo.s = d.buy; Progreso.guardar(); toast('Comprado: ' + A[d.buy].nom); armeria(); } else toast('Te faltan pesetas'); }
      else if (d.buyoro) { if (P.oro < +d.oro) { tab('tienda'); toast('Te falta oro'); return; } if (await confirmar('Comprar con oro', A[d.buyoro].nom + ' por ' + d.oro + ' de oro.', 'Comprar')) { Progreso.gastar(0, +d.oro); P.armas[d.buyoro] = 1; if (!P.equipo.s) P.equipo.s = d.buyoro; Progreso.guardar(); toast('Comprado: ' + A[d.buyoro].nom); armeria(); } }
      else if (d.tateq) { P.equipo.tat = d.tateq; Progreso.guardar(); armeria(); }
      else if (d.tatbuy) { const t = T[d.tatbuy]; if (t.oro && P.oro < t.oro) { tab('tienda'); toast('Te falta oro'); return; } if (Progreso.gastar(t.pts, t.oro)) { P.tatuajes[d.tatbuy] = 1; P.equipo.tat = d.tatbuy; Progreso.guardar(); toast('Tatuaje: ' + t.nom); armeria(); } else toast('Te faltan pesetas'); }
      cabecera();
    };
  }

  function hoja() {
    const P = Progreso.P, R = Progreso.RANGOS, r = Progreso.rango(), M = Progreso.MEDALLAS, s = P.stats;
    let h = '<div class="dos"><div><h3>Escalafón</h3><ol class="escala">';
    R.forEach((x, i) => { h += '<li class="' + (i < r ? 'pasado' : i === r ? 'actual' : '') + '">' + Progreso.insignia(i, 24) + '<span><b>' + x.nom + '</b><small>' + fmt(x.xp) + ' pts · ' + x.ventaja + '</small></span></li>'; });
    h += '</ol></div><div><h3>Medallas</h3><div class="medallas">';
    for (const id in M) { const n = P.medallas[id] || 0; h += '<div class="med' + (n ? '' : ' no') + '">' + Progreso.medallaSVG(id) + '<span><b>' + M[id].nom + (n > 1 ? ' ×' + n : '') + '</b><small>' + M[id].req + ' · ₧ ' + M[id].pts + (M[id].oro ? ' · ◆ ' + M[id].oro : '') + '</small></span></div>'; }
    h += '</div><h3>Hoja de servicios</h3><dl class="datos">' +
      '<dt>Misiones cumplidas</dt><dd>' + s.misiones + '</dd><dt>Bajas propias</dt><dd>' + s.bajas + '</dd><dt>A la cabeza</dt><dd>' + s.cabezas + '</dd>' +
      '<dt>Puntería</dt><dd>' + (s.tiros ? Math.round(s.aciertos / s.tiros * 100) : 0) + ' %</dd><dt>Veces caído</dt><dd>' + s.caidas + '</dd></dl></div></div>';
    $('tab-hoja').innerHTML = h;
  }

  function ranking() {
    const P = Progreso.P, glob = Progreso.Ranking.global();
    let h = '<h3>Ranking global</h3>';
    h += glob ? '<button type="button" class="boton" id="bGlobal">Ver ranking de Google Play Juegos</button>'
      : '<p class="parte">El ranking mundial de legionarios (puntos de servicio y medallas) funciona en la app de Android con Google Play Juegos. En el navegador solo se guardan tus marcas.</p>';
    h += '<h3>Tus marcas</h3><table class="tabla"><thead><tr><th>Misión</th><th>Mejor marca</th></tr></thead><tbody>';
    MISIONES.forEach(m => { h += '<tr><td>' + esc(m.tit) + '</td><td>' + (P.mejor[m.id] ? fmt(P.mejor[m.id]) : '—') + '</td></tr>'; });
    const med = Object.values(P.medallas).reduce((a, b) => a + b, 0);
    h += '<tr class="total"><td>Puntos de servicio · ' + med + ' medallas</td><td>' + fmt(P.xp) + '</td></tr></tbody></table>';
    if (P.historial.length) { h += '<h3>Últimas misiones</h3><table class="tabla"><tbody>'; P.historial.slice(0, 8).forEach(x => { const m = MISIONES.find(y => y.id === x.m); h += '<tr><td>' + x.d + ' · ' + esc(m ? m.tit : x.m) + '</td><td>' + fmt(x.p) + '</td></tr>'; }); h += '</tbody></table>'; }
    $('tab-ranking').innerHTML = h;
    if (glob) $('bGlobal').onclick = () => Progreso.Ranking.abrirGlobal();
  }

  function tienda() {
    const P = Progreso.P, PR = Progreso.PRODUCTOS, quedan = Progreso.Anuncios.quedanHoy();
    let h = '<div class="cartas">';
    h += '<div class="carta destacada"><b>Vídeo de la Bandera</b><small>Mira un anuncio y gana 5 de oro. Quedan ' + quedan + ' hoy.</small><div class="acc"><button type="button" class="mini oro" id="bVideo"' + (quedan > 0 ? '' : ' disabled') + '>Ver vídeo · +5 ◆</button></div></div>';
    for (const id in PR) {
      const p = PR[id]; if (id === 'veterano' && P.veterano) continue; if (id === 'sin_anuncios' && P.sinAnuncios) continue;
      h += '<div class="carta' + (id === 'veterano' ? ' destacada' : '') + '"><b>' + p.nom + (p.etiqueta ? ' <span class="chip">' + p.etiqueta + '</span>' : '') + '</b><small>' + (p.desc || 'Oro para armas, tatuajes y acceso anticipado.') + '</small><div class="acc"><button type="button" class="mini" data-prod="' + id + '">' + p.precio + '</button></div></div>';
    }
    h += '</div><p class="nota">Todo lo que se compra con oro también se puede conseguir jugando: con pesetas, subiendo de empleo y con las medallas.</p>';
    const el = $('tab-tienda'); el.innerHTML = h;
    $('bVideo') && ($('bVideo').onclick = async () => { if (await Progreso.Anuncios.recompensado()) { P.oro += 5; Progreso.guardar(); toast('+5 de oro'); tienda(); cabecera(); } });
    el.querySelectorAll('[data-prod]').forEach(b => b.onclick = async () => { if (await Progreso.comprar(b.dataset.prod)) { toast('Compra entregada'); tienda(); cabecera(); } });
  }

  // pantalla de fin de misión con desglose, medallas y ascenso
  function fin(res, ok, onDoblar) {
    const R = Progreso.RANGOS;
    let h = '<table class="tabla">';
    res.lineas.forEach(l => { h += '<tr><td>' + l[0] + '</td><td>' + l[1] + '</td><td>' + fmt(l[2]) + '</td></tr>'; });
    h += '<tr class="total"><td>Total' + (res.mult !== 1 ? ' (× ' + res.mult + ' dificultad)' : '') + (ok ? '' : ' (× 0,3 misión fallida)') + '</td><td></td><td>' + fmt(res.puntos) + '</td></tr></table>';
    h += '<p class="botin">₧ +' + fmt(res.pts) + (res.oro ? ' &nbsp; ◆ +' + res.oro : '') + '</p>';
    if (res.medallas.length) h += '<div class="medallas">' + res.medallas.map(id => '<div class="med">' + Progreso.medallaSVG(id) + '<span><b>' + Progreso.MEDALLAS[id].nom + '</b><small>Concedida</small></span></div>').join('') + '</div>';
    if (res.herida) h += '<div class="ascenso herida"><span><b>Herida de guerra: ' + Avatar.HERIDAS[res.herida].nom + '</b><small>' + Avatar.HERIDAS[res.herida].txt + ' Se verá en tu legionario (puedes ocultarla en «Mi legionario»).</small></span></div>';
    if (res.rangoNuevo > res.rangoAntes) h += '<div class="ascenso">' + Progreso.insignia(res.rangoNuevo, 40) + '<span><b>¡Ascenso a ' + R[res.rangoNuevo].nom + '!</b><small>' + R[res.rangoNuevo].ventaja + '</small></span></div>';
    $('fRes').innerHTML = h;
    const b = $('bDoblar'); b.hidden = !(res.pts > 0 && Progreso.Anuncios.quedanHoy() > 0); b.disabled = false;
    b.textContent = 'Doblar pesetas viendo un vídeo (+' + fmt(res.pts) + ')';
    b.onclick = async () => { b.disabled = true; if (await Progreso.Anuncios.recompensado()) { Progreso.P.pts += res.pts; Progreso.guardar(); b.textContent = 'Pesetas dobladas'; onDoblar && onDoblar(); } else b.disabled = false; };
  }

  // ---------- portada: bandera de España ondeando y emblema de la Legión ----------
  let nEmb = 0;
  function emblema(tam) {
    const id = 'emb' + (nEmb++);
    return '<svg width="' + tam + '" height="' + Math.round(tam * 1.15) + '" viewBox="0 0 200 230" role="img" aria-label="Emblema de la Legión: alabarda, arcabuz y ballesta bajo corona"><defs>' +
      '<g id="' + id + 'f"><path d="M62 54 L68 26 L84 42 L100 16 L116 42 L132 26 L138 54 Z"/><rect x="58" y="54" width="84" height="11" rx="2"/>' +
      '<circle cx="68" cy="22" r="5"/><circle cx="100" cy="12" r="5"/><circle cx="132" cy="22" r="5"/>' +
      '<path d="M150 86 Q176 86 180 112 L160 102 Z"/><path d="M161 79 L176 60 L169 84 Z"/><path d="M151 199 L172 221 L160 229 L139 208 Z"/><rect x="94" y="208" width="12" height="16" rx="2"/></g>' +
      '<g id="' + id + 't" fill="none" stroke-linecap="round"><line x1="40" y1="216" x2="162" y2="80"/><line x1="146" y1="200" x2="36" y2="80"/><line x1="100" y1="98" x2="100" y2="214"/><path d="M44 124 Q100 84 156 124"/><path d="M44 124 L100 146 L156 124" stroke-width="0.4em"/></g></defs>' +
      '<use href="#' + id + 'f" fill="#241307" stroke="#241307" stroke-width="10"/><use href="#' + id + 't" stroke="#241307" stroke-width="15"/>' +
      '<use href="#' + id + 'f" fill="#e8b923"/><use href="#' + id + 't" stroke="#e8b923" stroke-width="7"/></svg>';
  }
  function portada(alEntrar) {
    $('pEmblema').innerHTML = emblema(150);
    $('mEmblema').innerHTML = emblema(46);
    const cv = $('bandera'), g = cv.getContext('2d'); let t = 0;
    const tono = (rgb, k) => 'rgb(' + rgb.map(v => Math.max(0, Math.min(255, Math.round(v * k)))).join(',') + ')';
    (function dib() {
      if ($('portada').hidden) return;
      requestAnimationFrame(dib); t += 0.016;
      const dpr = Math.min(2, devicePixelRatio || 1), w = cv.clientWidth, h = cv.clientHeight;
      if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
      g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
      const fw = Math.min(w * 0.82, h * 1.1), fh = fw * 2 / 3, x0 = (w - fw) / 2 + 6, y0 = (h - fh) / 2;
      g.fillStyle = '#4a3b2a'; g.fillRect(x0 - 7, y0 - 14, 6, fh + h * 0.3); g.fillStyle = '#c9a227'; g.beginPath(); g.arc(x0 - 4, y0 - 16, 6, 0, 6.3); g.fill();
      for (let i = 0; i < fw; i += 2) {
        const k = i / fw, fase = k * 7.5 - t * 3.2, off = Math.sin(fase) * fh * 0.06 * k, luz = 1 + Math.cos(fase) * 0.2 * k;
        g.fillStyle = tono([198, 11, 30], luz); g.fillRect(x0 + i, y0 + off, 2.6, fh / 4);
        g.fillStyle = tono([255, 196, 0], luz); g.fillRect(x0 + i, y0 + off + fh / 4, 2.6, fh / 2);
        g.fillStyle = tono([198, 11, 30], luz); g.fillRect(x0 + i, y0 + off + fh * 3 / 4, 2.6, fh / 4);
      }
    })();
    $('portada').onclick = () => {
      Snd.init(); Snd.corneta('diana');
      setTimeout(() => Snd.voz('viva_legion', 1), 1900);
      setTimeout(() => Snd.voz('coro_viva', 1), 3100);
      $('portada').hidden = true; alEntrar && alEntrar();
    };
  }

  function init(fJugar) {
    alJugar = fJugar;
    document.querySelectorAll('.pestanas button[data-tab]').forEach(b => b.onclick = () => tab(b.dataset.tab));
  }
  return { init, tab, cabecera, confirmar, toast, fin, fmt, portada, emblema };
})();
