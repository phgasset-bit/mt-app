// Progresión y monetización: perfil, escalafón, armería, tatuajes, medallas, puntuación, ranking, anuncios y compras.
// Anuncios y compras usan los plugins nativos si existen (AdMob y Google Play Billing vía Capacitor);
// en el navegador funcionan en "modo prueba": se simulan sin cobrar nada.
const Progreso = (() => {
  // ---------- escalafón ----------
  const RANGOS = [
    { nom: 'Legionario', xp: 0, ins: 'leg', ventaja: 'Mauser y escuadra de 5' },
    { nom: 'Legionario de 1ª', xp: 2400, ins: 'r1', ventaja: '+1 granada', gran: 1 },
    { nom: 'Cabo', xp: 7500, ins: 'r2', ventaja: '+1 legionario en tu escuadra', esc: 1 },
    { nom: 'Cabo 1º', xp: 15000, ins: 'r3', ventaja: 'Desbloquea el subfusil naranjero' },
    { nom: 'Sargento', xp: 27000, ins: 'o1', ventaja: '+1 granada y fusil ametrallador FAO', gran: 1 },
    { nom: 'Sargento 1º', xp: 42000, ins: 'o2', ventaja: '+1 cura', cura: 1 },
    { nom: 'Brigada', xp: 60000, ins: 'o3', ventaja: 'Desbloquea el CETME modelo A' },
    { nom: 'Subteniente', xp: 84000, ins: 's1', ventaja: '+1 legionario en tu escuadra', esc: 1 },
    { nom: 'Alférez', xp: 114000, ins: 'e1', ventaja: '+1 pasada de la aviación', avion: 1 },
    { nom: 'Teniente', xp: 150000, ins: 'e2', ventaja: '+1 granada', gran: 1 },
    { nom: 'Capitán', xp: 195000, ins: 'e3', ventaja: 'Mando de compañía: +1 cura y +1 legionario', cura: 1, esc: 1 }
  ];
  // insignia en SVG: tropa galletas rojas, suboficiales galones dorados, oficiales estrellas de seis puntas
  function insignia(i, tam) {
    const r = RANGOS[i].ins, t = tam || 28, n = +r.slice(1) || 0;
    let c = '';
    if (r === 'leg') c = '<rect x="9" y="12" width="10" height="4" rx="1" fill="#6e6c47"/>';
    else if (r[0] === 'r') for (let k = 0; k < n; k++) c += '<rect x="5" y="' + (8 + k * 5) + '" width="18" height="3.4" fill="#c4281f"/>';
    else if (r[0] === 'o') for (let k = 0; k < n; k++) c += '<path d="M4 ' + (14 + k * 5) + ' L14 ' + (8 + k * 5) + ' L24 ' + (14 + k * 5) + '" stroke="#e8b923" stroke-width="2.6" fill="none"/>';
    else {
      const est = (cx, cy) => { let p = ''; for (let q = 0; q < 12; q++) { const a = q * Math.PI / 6 - Math.PI / 2, rr = q % 2 ? 2.2 : 4.6; p += (q ? 'L' : 'M') + (cx + Math.cos(a) * rr).toFixed(1) + ' ' + (cy + Math.sin(a) * rr).toFixed(1); } return '<path d="' + p + 'Z" fill="#e8b923"/>'; };
      if (r[0] === 's') c = est(14, 11) + '<rect x="6" y="19" width="16" height="2.4" fill="#e8b923"/>';
      else for (let k = 0; k < n; k++) c += est(n === 1 ? 14 : n === 2 ? 9 + k * 10 : [14, 8, 20][k], n === 3 && k === 0 ? 8 : 15);
    }
    return '<svg width="' + t + '" height="' + t + '" viewBox="0 0 28 28" aria-hidden="true"><rect width="28" height="28" rx="3" fill="#2a2418"/>' + c + '</svg>';
  }

  // ---------- armería ----------
  const ARMAS = {
    mauser: { nom: 'Mauser M43 7,92', desc: 'Fusil de cerrojo reglamentario. Cinco cartuchos, mata de un disparo.', rango: 0, pts: 0, oro: 0, tipo: 'mauser', carg: 5, res: 45, cad: 1.2, dmg: 120, disp: 0.03, dispM: 0.002, rec: 2.6, auto: false, retro: 0.06 },
    z45: { nom: 'Subfusil Star Z-45', desc: 'Subfusil de 9 mm. Cadencia alta, alcance corto.', rango: 0, pts: 2000, oro: 120, tipo: 'z45', carg: 30, res: 120, cad: 0.13, dmg: 34, disp: 0.045, dispM: 0.018, rec: 2.3, auto: true, retro: 0.018 },
    naranjero: { nom: 'Subfusil naranjero', desc: 'Copia valenciana del MP-28 con cargador lateral de 32.', rango: 3, pts: 4500, oro: 200, tipo: 'z45', carg: 32, res: 128, cad: 0.1, dmg: 32, disp: 0.05, dispM: 0.02, rec: 2.6, auto: true, retro: 0.02 },
    fao: { nom: 'Fusil ametrallador FAO', desc: 'Arma de pelotón de 7,92. Pega fuerte y se recarga despacio.', rango: 4, pts: 8000, oro: 320, tipo: 'mauser', carg: 20, res: 100, cad: 0.11, dmg: 80, disp: 0.055, dispM: 0.012, rec: 3.6, auto: true, retro: 0.035 },
    cetme: { nom: 'CETME modelo A', desc: 'Fusil de asalto español de 1958, los primeros en pruebas. Preciso y automático.', rango: 6, pts: 14000, oro: 480, tipo: 'mauser', carg: 20, res: 100, cad: 0.11, dmg: 72, disp: 0.035, dispM: 0.006, rec: 2.4, auto: true, retro: 0.028 }
  };

  // ---------- tatuajes (en el antebrazo, visibles en primera persona) ----------
  const TATUAJES = {
    ninguno: { nom: 'Sin tatuaje', pts: 0, oro: 0 },
    ancla: { nom: 'Ancla', pts: 400, oro: 0 },
    madre: { nom: 'Corazón «Madre»', pts: 900, oro: 0 },
    calavera: { nom: 'Calavera y tibias', pts: 0, oro: 60 },
    legion: { nom: 'Puñal «Legión»', pts: 2500, oro: 0, rango: 2 },
    novio: { nom: 'Novio de la Muerte', pts: 0, oro: 120 },
    cristo: { nom: 'Cristo de la Buena Muerte', pts: 0, oro: 150 },
    armas: { nom: 'Alabarda, arcabuz y ballesta', pts: 0, oro: 200, rango: 4 }
  };
  function dibujaTatuaje(id, g, cx, cy, s) {
    g.save(); g.translate(cx, cy); g.scale(s, s);
    g.strokeStyle = 'rgba(28,42,66,.9)'; g.fillStyle = 'rgba(28,42,66,.9)'; g.lineWidth = 3; g.lineCap = 'round'; g.lineJoin = 'round';
    const texto = (t, y, tam) => { g.font = 'bold ' + (tam || 13) + 'px serif'; g.textAlign = 'center'; g.fillText(t, 0, y); };
    const cinta = (y, w) => { g.beginPath(); g.moveTo(-w, y - 8); g.lineTo(w, y - 8); g.lineTo(w + 8, y); g.lineTo(w, y + 8); g.lineTo(-w, y + 8); g.lineTo(-w - 8, y); g.closePath(); g.stroke(); };
    const calavera = (y) => { g.beginPath(); g.arc(0, y, 16, Math.PI * 0.9, Math.PI * 2.1); g.lineTo(9, y + 20); g.lineTo(-9, y + 20); g.closePath(); g.stroke(); g.beginPath(); g.arc(-6, y + 2, 4.5, 0, 6.3); g.arc(6, y + 2, 4.5, 0, 6.3); g.fill(); g.beginPath(); g.moveTo(0, y + 8); g.lineTo(-2, y + 12); g.lineTo(2, y + 12); g.fill(); };
    switch (id) {
      case 'ancla': g.beginPath(); g.arc(0, -26, 6, 0, 6.3); g.moveTo(0, -20); g.lineTo(0, 26); g.moveTo(-14, -12); g.lineTo(14, -12); g.moveTo(-22, 12); g.quadraticCurveTo(-18, 30, 0, 28); g.quadraticCurveTo(18, 30, 22, 12); g.stroke(); break;
      case 'madre': g.beginPath(); g.moveTo(0, 18); g.bezierCurveTo(-34, -6, -18, -30, 0, -14); g.bezierCurveTo(18, -30, 34, -6, 0, 18); g.stroke(); cinta(2, 26); texto('MADRE', 6, 12); break;
      case 'calavera': calavera(-12); g.beginPath(); g.moveTo(-22, 14); g.lineTo(22, 30); g.moveTo(22, 14); g.lineTo(-22, 30); g.stroke(); break;
      case 'legion': g.beginPath(); g.moveTo(0, -34); g.lineTo(5, 8); g.lineTo(-5, 8); g.closePath(); g.stroke(); g.beginPath(); g.moveTo(-12, 10); g.lineTo(12, 10); g.moveTo(0, 10); g.lineTo(0, 24); g.stroke(); cinta(0, 30); texto('LEGIÓN', 4, 12); break;
      case 'novio': calavera(-22); cinta(16, 40); texto('NOVIO DE LA', 13, 9); texto('MUERTE', 24, 9); break;
      case 'cristo': g.lineWidth = 4; g.beginPath(); g.moveTo(0, -34); g.lineTo(0, 30); g.moveTo(-18, -18); g.lineTo(18, -18); g.stroke(); g.lineWidth = 1.5; for (let a = 0; a < 12; a++) { const an = a / 12 * 6.28; g.beginPath(); g.moveTo(Math.cos(an) * 9, -18 + Math.sin(an) * 9); g.lineTo(Math.cos(an) * 16, -18 + Math.sin(an) * 16); g.stroke(); } break;
      case 'armas': g.lineWidth = 2.6; g.beginPath(); g.moveTo(-24, 28); g.lineTo(24, -28); g.moveTo(24, 28); g.lineTo(-24, -28); g.moveTo(0, 30); g.lineTo(0, -32); g.stroke(); g.beginPath(); g.moveTo(-24, -28); g.lineTo(-14, -30); g.lineTo(-20, -20); g.closePath(); g.fill(); g.beginPath(); g.arc(0, -10, 16, Math.PI * 1.15, Math.PI * 1.85); g.stroke(); g.fillRect(19, 22, 8, 10); break;
    }
    g.restore();
  }

  // ---------- medallas ----------
  const MEDALLAS = {
    sufrimientos: { nom: 'Medalla de Sufrimientos por la Patria', req: 'Cumple una misión tras quedarte por debajo de 30 de salud', pts: 200, oro: 0, color: '#7a1f1f' },
    merito: { nom: 'Cruz del Mérito Militar, distintivo rojo', req: '8 o más bajas propias en una misión cumplida', pts: 300, oro: 0, color: '#b3261e' },
    tirador: { nom: 'Distintivo de Tirador Selecto', req: '5 bajas de un disparo a la cabeza en una misión', pts: 250, oro: 0, color: '#5a6b3a' },
    nadie: { nom: 'Mención: nadie se queda atrás', req: 'Cumple una misión sin perder a ningún legionario', pts: 400, oro: 5, color: '#3c4a33' },
    militar: { nom: 'Medalla Militar Individual', req: '20 o más bajas propias en Veterano', pts: 1000, oro: 20, color: '#c9a227' },
    laureada: { nom: 'Cruz Laureada de San Fernando', req: 'Veterano, sin bajas en la escuadra y con más de 50 de salud', pts: 3000, oro: 50, color: '#e8b923' },
    campana: { nom: 'Medalla de la Campaña de Ifni-Sáhara', req: 'Cumple las seis misiones', pts: 2000, oro: 30, color: '#c60b1e', unica: true }
  };
  function medallaSVG(id, t) {
    const m = MEDALLAS[id];
    return '<svg width="' + (t || 34) + '" height="' + (t || 34) + '" viewBox="0 0 34 34" aria-hidden="true"><path d="M11 0h12l-2 12h-8z" fill="' + m.color + '"/><path d="M14 0h6v12h-6z" fill="#ffc400" opacity=".7"/><circle cx="17" cy="22" r="10" fill="#c9a227" stroke="#6b5212" stroke-width="1.5"/><path d="M17 15l2 5h5l-4 3 2 5-5-3-5 3 2-5-4-3h5z" fill="' + m.color + '"/></svg>';
  }

  // ---------- perfil ----------
  const BASE = { nombre: 'Legionario', xp: 0, pts: 2500, oro: 0, armas: { mauser: 1 }, tatuajes: { ninguno: 1 }, equipo: { p: 'mauser', s: null, tat: 'ninguno' }, medallas: {}, hechas: {}, mejor: {}, stats: { misiones: 0, bajas: 0, cabezas: 0, tiros: 0, aciertos: 0, caidas: 0 }, sinAnuncios: false, veterano: false, avatar: { nombre: '', piel: 1, pelo: 0, fisico: 'cachas', barba: 'corta', tocado: 'gorrillo', camisa: 'caqui', panuelo: 'no' }, alistado: false, cosmeticos: { 'tocado:gorrillo': 1, 'tocado:sin': 1, 'camisa:caqui': 1, 'barba:ninguna': 1, 'panuelo:no': 1 }, heridas: { ojo: false, cicatriz: false, cabeza: false }, mostrarHeridas: true, anunciosHoy: { dia: '', n: 0 }, misionesDesdeAnuncio: 0, historial: [] };
  let P = JSON.parse(JSON.stringify(BASE));
  try { const s = JSON.parse(localStorage.getItem('ifni_perfil') || 'null'); if (s) P = Object.assign(P, s); } catch (e) {}
  const guardar = () => { try { localStorage.setItem('ifni_perfil', JSON.stringify(P)); } catch (e) {} };
  function rango(xp) { let r = 0; RANGOS.forEach((x, i) => { if ((xp == null ? P.xp : xp) >= x.xp) r = i; }); return r; }
  function ventajas() {
    const r = rango(), v = { esc: 0, gran: 0, cura: 0, avion: 0 };
    for (let i = 0; i <= r; i++) for (const k in v) v[k] += RANGOS[i][k] || 0;
    return v;
  }
  function puedeComprarArma(id) { const a = ARMAS[id]; return !P.armas[id] && rango() >= a.rango; }

  // ---------- puntuación y recompensas ----------
  const MULT = { 0.6: 0.7, 1: 1, 1.5: 1.6 };
  function terminar(r) {
    const mult = MULT[r.dif] || 1, prec = r.tiros ? r.aciertos / r.tiros : 0;
    const lineas = [
      ['Bajas propias', r.bajasJ, r.bajasJ * 100],
      ['A la cabeza', r.cabezas, r.cabezas * 60],
      ['Bajas de la escuadra', r.bajas - r.bajasJ, (r.bajas - r.bajasJ) * 25],
      ['Legionarios en pie', r.vivos + '/' + r.aliadosIni, r.vivos * 150],
      ['Puntería', Math.round(prec * 100) + ' %', Math.round(prec * 300)],
      ['Misión cumplida', r.ok ? 'sí' : 'no', r.ok ? 500 : 0]
    ];
    let puntos = lineas.reduce((s, l) => s + l[2], 0) * mult * (r.ok ? 1 : 0.3);
    puntos = Math.round(puntos);
    const rangoAntes = rango();
    let pts = Math.round(puntos / 6), oro = 0;
    const ganadas = []; let herida = null;
    if (r.ok) {
      const dar = id => { const m = MEDALLAS[id]; if (m.unica && P.medallas[id]) return; P.medallas[id] = (P.medallas[id] || 0) + 1; ganadas.push(id); pts += m.pts; oro += m.oro; };
      if (r.minVida < 30) dar('sufrimientos');
      if (r.bajasJ >= 8) dar('merito');
      if (r.cabezas >= 5) dar('tirador');
      if (r.vivos === r.aliadosIni) dar('nadie');
      if (r.dif >= 1.5 && r.bajasJ >= 20) dar('militar');
      if (r.dif >= 1.5 && r.vivos === r.aliadosIni && r.vidaFinal > 50) dar('laureada');
      P.hechas[r.mision] = 1;
      // heridas de guerra: quien sale muy tocado de una misión puede quedar marcado para siempre
      if (r.minVida < 25 || r.revivido) {
        const H = P.heridas, d = Math.random();
        if (!H.ojo && d < 0.3) herida = 'ojo'; else if (!H.cicatriz && d < 0.65) herida = 'cicatriz'; else if (!H.cabeza && d < 0.85) herida = 'cabeza';
        if (herida) H[herida] = true;
      }
      if (MISIONES.every(m => P.hechas[m.id])) dar('campana');
    }
    P.xp += puntos; P.pts += pts; P.oro += oro;
    P.stats.misiones += r.ok ? 1 : 0; P.stats.bajas += r.bajasJ; P.stats.cabezas += r.cabezas; P.stats.tiros += r.tiros; P.stats.aciertos += r.aciertos; if (!r.ok) P.stats.caidas++;
    if (!P.mejor[r.mision] || puntos > P.mejor[r.mision]) P.mejor[r.mision] = puntos;
    P.historial.unshift({ m: r.mision, p: puntos, d: new Date().toISOString().slice(0, 10), dif: r.dif }); P.historial = P.historial.slice(0, 30);
    P.misionesDesdeAnuncio++;
    guardar(); Ranking.enviar();
    return { lineas, mult, puntos, pts, oro, medallas: ganadas, rangoAntes, rangoNuevo: rango(), herida };
  }

  // ---------- ranking ----------
  // Global: Google Play Juegos (marcadores) cuando el plugin nativo está disponible. Mientras, marcas locales.
  const Ranking = {
    global() { return !!(window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.PlayGames); },
    enviar() {
      if (!Ranking.global()) return;
      try { Capacitor.Plugins.PlayGames.submitScore({ leaderboardId: 'puntos_totales', score: P.xp }); } catch (e) {}
    },
    abrirGlobal() { try { Capacitor.Plugins.PlayGames.showLeaderboard({ leaderboardId: 'puntos_totales' }); } catch (e) {} }
  };

  // ---------- anuncios ----------
  function hoy() { return new Date().toISOString().slice(0, 10); }
  const Anuncios = {
    nativos() { return !!(window.Capacitor && Capacitor.Plugins && Capacitor.Plugins.AdMob); },
    quedanHoy() { if (P.anunciosHoy.dia !== hoy()) P.anunciosHoy = { dia: hoy(), n: 0 }; return 12 - P.anunciosHoy.n; },
    async recompensado() {
      if (Anuncios.quedanHoy() <= 0) return false;
      let ok;
      if (Anuncios.nativos()) {
        try { const A = Capacitor.Plugins.AdMob; await A.prepareRewardVideoAd({ adId: AD_IDS.recompensado }); const r = await A.showRewardVideoAd(); ok = !!r; } catch (e) { ok = false; }
      } else ok = await simulaAnuncio(true);
      if (ok) { P.anunciosHoy.n++; guardar(); }
      return ok;
    },
    async intersticial() {
      if (P.sinAnuncios || P.misionesDesdeAnuncio < 2) return;
      P.misionesDesdeAnuncio = 0; guardar();
      if (Anuncios.nativos()) { try { const A = Capacitor.Plugins.AdMob; await A.prepareInterstitial({ adId: AD_IDS.intersticial }); await A.showInterstitial(); } catch (e) {} }
      else await simulaAnuncio(false);
    }
  };
  // identificadores de prueba oficiales de AdMob; se sustituyen por los reales al publicar
  const AD_IDS = { recompensado: 'ca-app-pub-3940256099942544/5224354917', intersticial: 'ca-app-pub-3940256099942544/1033173712' };
  function simulaAnuncio(recompensa) {
    return new Promise(res => {
      const el = document.getElementById('anuncio'), t = document.getElementById('anT'), b = document.getElementById('anCerrar');
      let n = recompensa ? 5 : 3; el.hidden = false; b.hidden = true; t.textContent = n;
      const iv = setInterval(() => { n--; t.textContent = Math.max(0, n); if (n <= 0) { clearInterval(iv); b.hidden = false; } }, 1000);
      b.onclick = () => { el.hidden = true; res(true); };
    });
  }

  // ---------- compras ----------
  const PRODUCTOS = {
    oro_100: { nom: '100 de oro', precio: '0,99 €', oro: 100, eur: 0.99 },
    oro_550: { nom: '550 de oro', precio: '4,99 €', oro: 550, eur: 4.99, etiqueta: '+10 %' },
    oro_1200: { nom: '1.200 de oro', precio: '9,99 €', oro: 1200, eur: 9.99, etiqueta: '+20 %' },
    oro_2500: { nom: '2.500 de oro', precio: '19,99 €', oro: 2500, eur: 19.99, etiqueta: '+25 %' },
    pts_3000: { nom: '3.000 pesetas', precio: '0,99 €', pts: 3000, eur: 0.99 },
    pts_16000: { nom: '16.000 pesetas', precio: '4,99 €', pts: 16000, eur: 4.99, etiqueta: '+7 %' },
    pts_35000: { nom: '35.000 pesetas', precio: '9,99 €', pts: 35000, eur: 9.99, etiqueta: '+17 %' },
    sin_anuncios: { nom: 'Sin anuncios', precio: '3,99 €', desc: 'Quita los anuncios entre misiones. Las recompensas por vídeo siguen disponibles si las quieres.' },
    veterano: { nom: 'Pack Veterano', precio: '2,99 €', desc: '500 de oro, subfusil Z-45, tatuaje «Novio de la Muerte» y barba de gastador. Solo una vez.', unico: true }
  };
  function entregar(id) {
    const p = PRODUCTOS[id];
    if (p.oro) P.oro += p.oro;
    if (p.pts) P.pts += p.pts;
    if (id === 'sin_anuncios') P.sinAnuncios = true;
    if (id === 'veterano') { P.veterano = true; P.oro += 500; P.armas.z45 = 1; P.tatuajes.novio = 1; P.cosmeticos['barba:gastador'] = 1; }
    guardar();
  }
  // equivalencia en euros (tarifa de la bolsa de 4,99 €) y bolsa más barata que cubre lo que falta
  function euros(pts, oro) { return (pts || 0) * 4.99 / 16000 + (oro || 0) * 4.99 / 550; }
  function bolsaPara(pts, oro) {
    const lista = Object.keys(PRODUCTOS).filter(k => oro > 0 ? PRODUCTOS[k].oro >= oro : PRODUCTOS[k].pts >= pts).filter(k => k.startsWith(oro > 0 ? 'oro_' : 'pts_'));
    return lista.sort((a, b) => PRODUCTOS[a].eur - PRODUCTOS[b].eur)[0] || (oro > 0 ? 'oro_2500' : 'pts_35000');
  }
  async function comprar(id, yaConfirmado) {
    const store = window.CdvPurchase && CdvPurchase.store;
    if (store) {
      // producción: Google Play Billing; la entrega se confirma en el callback 'approved' (ver docs/MONETIZACION.md)
      try { const prod = store.get(id); const oferta = prod && prod.getOffer(); if (oferta) await oferta.order(); } catch (e) {}
      return false;
    }
    const ok = yaConfirmado || await UI.confirmar('Compra de prueba', PRODUCTOS[id].nom + ' por ' + PRODUCTOS[id].precio + '. En el navegador es una simulación: no se cobra nada.', 'Simular compra');
    if (ok) entregar(id);
    return ok;
  }
  function gastar(pts, oro) { if (P.pts < pts || P.oro < oro) return false; P.pts -= pts; P.oro -= oro; guardar(); return true; }
  function reiniciar() { P = JSON.parse(JSON.stringify(BASE)); guardar(); }

  return { euros, bolsaPara, RANGOS, ARMAS, TATUAJES, MEDALLAS, PRODUCTOS, insignia, medallaSVG, dibujaTatuaje, rango, ventajas, puedeComprarArma, terminar, Ranking, Anuncios, comprar, gastar, guardar, reiniciar, get P() { return P; } };
})();
