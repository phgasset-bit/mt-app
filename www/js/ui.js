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
      '<div class="pf-txt"><b>' + R[r].nom + '</b><span>' + fmt(P.xp) + (sig ? ' / ' + fmt(sig.xp) + ' pts de servicio' : ' pts · rango máximo') + '</span><div class="barra"><i style="width:' + pct + '%"></i></div></div>' +
      '<div class="monedas"><span title="Pesetas">₧ ' + fmt(P.pts) + '</span><span class="oro" title="Oro">◆ ' + fmt(P.oro) + '</span></div>';
  }

  function tab(nombre) {
    document.querySelectorAll('.pestanas button').forEach(b => b.classList.toggle('on', b.dataset.tab === nombre));
    ['campana', 'armeria', 'hoja', 'ranking', 'tienda'].forEach(t => $('tab-' + t).hidden = t !== nombre);
    ({ campana, armeria, hoja, ranking, tienda })[nombre]();
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
    if (res.rangoNuevo > res.rangoAntes) h += '<div class="ascenso">' + Progreso.insignia(res.rangoNuevo, 40) + '<span><b>¡Ascenso a ' + R[res.rangoNuevo].nom + '!</b><small>' + R[res.rangoNuevo].ventaja + '</small></span></div>';
    $('fRes').innerHTML = h;
    const b = $('bDoblar'); b.hidden = !(res.pts > 0 && Progreso.Anuncios.quedanHoy() > 0); b.disabled = false;
    b.textContent = 'Doblar pesetas viendo un vídeo (+' + fmt(res.pts) + ')';
    b.onclick = async () => { b.disabled = true; if (await Progreso.Anuncios.recompensado()) { Progreso.P.pts += res.pts; Progreso.guardar(); b.textContent = 'Pesetas dobladas'; onDoblar && onDoblar(); } else b.disabled = false; };
  }

  function init(fJugar) {
    alJugar = fJugar;
    document.querySelectorAll('.pestanas button[data-tab]').forEach(b => b.onclick = () => tab(b.dataset.tab));
  }
  return { init, tab, cabecera, confirmar, toast, fin, fmt };
})();
