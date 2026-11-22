// Motor de juego: jugador en primera persona, escuadra legionaria que avanza por saltos, IA enemiga, fases, HUD y mandos.
(() => {
  const $ = id => document.getElementById(id);
  const V3 = THREE.Vector3;
  const rnd = (a, b) => a + Math.random() * (b - a);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const H = (x, z) => World.height(x, z);
  const lin = World.lin;

  // ---------- ajustes ----------
  const AJ = { sens: 1, vol: 0.9, auto: true, zurdo: false, dif: 1, calidad: 'alta', calAuto: true };
  try { Object.assign(AJ, JSON.parse(localStorage.getItem('ifni_aj') || '{}')); } catch (e) {}
  const guardarAJ = () => { try { localStorage.setItem('ifni_aj', JSON.stringify(AJ)); } catch (e) {} };

  // ---------- render ----------
  const canvas = $('c'), app = $('app');
  const tactil = matchMedia('(pointer:coarse)').matches || 'ontouchstart' in window;
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !tactil, powerPreference: 'high-performance' });
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  function aplicaCalidad() { renderer.setPixelRatio(Math.min(devicePixelRatio || 1, AJ.calidad === 'alta' ? (tactil ? 1.5 : 1.75) : 1)); renderer.shadowMap.enabled = AJ.calidad === 'alta'; try { scene.traverse(o => { if (o.material) [].concat(o.material).forEach(m => m.needsUpdate = true); }); } catch (e) {} }
  aplicaCalidad();
  const cam = new THREE.PerspectiveCamera(72, 1, 0.05, 1200); cam.rotation.order = 'YXZ';
  let scene = new THREE.Scene();
  function redim() {
    const w = app.clientWidth || innerWidth, h = app.clientHeight || innerHeight;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
    $('gira').hidden = !(h > w && tactil);
  }
  addEventListener('resize', redim);
  if (!tactil) app.classList.add('raton');

  // ---------- arma en primera persona, brazos remangados y tatuaje ----------
  const vm = new THREE.Group(); cam.add(vm);
  const T = World.tex();
  const mMadera = new THREE.MeshLambertMaterial({ map: T.madera, color: lin(0xb08060), fog: false });
  const mMetal = new THREE.MeshPhongMaterial({ color: lin(0x2a2b2e), shininess: 70, specular: lin(0x6a6a6a), fog: false });
  const mMetal2 = new THREE.MeshPhongMaterial({ color: lin(0x45474a), shininess: 50, specular: lin(0x555555), fog: false });
  const mPiel = new THREE.MeshLambertMaterial({ color: lin(0xc8996f), fog: false });
  const mManga = new THREE.MeshLambertMaterial({ color: lin(0x7a7350), fog: false });
  const UP = new V3(0, 1, 0);
  function tubo(r1, r2, a, b, material, padre) {
    const d = b.clone().sub(a), m = new THREE.Mesh(new THREE.CylinderGeometry(r2, r1, d.length(), 12), material);
    m.position.copy(a).add(b).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(UP, d.normalize()); padre.add(m); return m;
  }
  function pieza(geo, material, x, y, z, padre, rx) { const m = new THREE.Mesh(geo, material); m.position.set(x, y, z); if (rx) m.rotation.x = rx; padre.add(m); return m; }
  const B = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const Cy = (r, l, s) => { const g = new THREE.CylinderGeometry(r, r, l, s || 10); g.rotateX(Math.PI / 2); return g; };
  function modeloArma(id) {
    const g = new THREE.Group(); let muzz = -0.9, izq = -0.34;
    if (id === 'mauser') {
      pieza(B(0.052, 0.062, 0.6), mMadera, 0, -0.005, -0.25, g);
      pieza(B(0.05, 0.05, 0.2), mMadera, 0, -0.03, 0.12, g);
      pieza(B(0.058, 0.12, 0.3), mMadera, 0, -0.06, 0.34, g);
      pieza(Cy(0.012, 0.52, 8), mMetal, 0, 0.032, -0.63, g);
      pieza(Cy(0.016, 0.2, 12), mMetal2, 0, 0.036, 0.02, g);
      pieza(Cy(0.006, 0.07, 6), mMetal, 0.04, 0.04, 0.09, g).rotation.set(0, Math.PI / 2, 0);
      pieza(new THREE.SphereGeometry(0.012, 8, 6), mMetal, 0.075, 0.035, 0.09, g);
      [-0.4, -0.18].forEach(z => pieza(Cy(0.034, 0.018, 10), mMetal2, 0, 0.005, z, g));
      pieza(B(0.006, 0.026, 0.012), mMetal, 0, 0.055, -0.86, g);
      pieza(B(0.03, 0.016, 0.03), mMetal, 0, 0.058, -0.1, g);
    } else if (id === 'z45' || id === 'naranjero') {
      const nar = id === 'naranjero';
      pieza(Cy(0.022, 0.36, 12), mMetal, 0, 0.012, -0.13, g);
      pieza(Cy(0.028, 0.2, 10), mMetal2, 0, 0.012, -0.38, g);
      for (let i = 0; i < 4; i++) pieza(B(0.058, 0.012, 0.02), mMetal, 0, 0.012, -0.32 - i * 0.04, g);
      if (nar) pieza(B(0.2, 0.035, 0.05), mMetal, -0.12, 0.0, -0.12, g);
      else pieza(B(0.032, 0.2, 0.05), mMetal, 0, -0.11, -0.16, g);
      pieza(B(0.052, 0.07, nar ? 0.42 : 0.18), mMadera, 0, -0.035, nar ? 0.18 : 0.08, g);
      pieza(B(0.056, 0.11, 0.24), mMadera, 0, -0.06, nar ? 0.42 : 0.3, g);
      pieza(B(0.006, 0.025, 0.012), mMetal, 0, 0.045, -0.47, g);
      muzz = -0.5; izq = nar ? -0.3 : -0.3;
    } else if (id === 'fao') {
      pieza(Cy(0.018, 0.7, 10), mMetal, 0, 0.03, -0.6, g);
      pieza(Cy(0.03, 0.3, 12), mMetal2, 0, 0.03, -0.1, g);
      pieza(B(0.04, 0.16, 0.06), mMetal, 0, 0.13, -0.08, g).rotation.x = 0.3;
      pieza(B(0.056, 0.13, 0.32), mMadera, 0, -0.04, 0.3, g);
      pieza(B(0.03, 0.08, 0.04), mMadera, 0, -0.07, 0.06, g);
      pieza(Cy(0.008, 0.3, 6), mMetal, -0.02, -0.0, -0.55, g); pieza(Cy(0.008, 0.3, 6), mMetal, 0.02, -0.0, -0.55, g);
      pieza(B(0.05, 0.045, 0.2), mMadera, 0, 0.0, -0.33, g);
      muzz = -0.96; izq = -0.33;
    } else {
      pieza(Cy(0.024, 0.4, 12), mMetal2, 0, 0.03, -0.12, g);
      pieza(Cy(0.012, 0.6, 8), mMetal, 0, 0.022, -0.5, g);
      pieza(Cy(0.014, 0.42, 8), mMetal, 0, 0.06, -0.38, g);
      pieza(B(0.05, 0.06, 0.22), mMadera, 0, 0.0, -0.4, g);
      pieza(B(0.03, 0.17, 0.05), mMetal, 0, -0.1, -0.12, g).rotation.x = -0.15;
      pieza(B(0.05, 0.1, 0.3), mMadera, 0, 0.0, 0.25, g);
      pieza(B(0.03, 0.08, 0.04), mMetal, 0, -0.06, 0.05, g);
      pieza(Cy(0.02, 0.05, 10), mMetal, 0, 0.022, -0.82, g);
      muzz = -0.86; izq = -0.4;
    }
    return { g, muzz, izq };
  }
  const brazos = new THREE.Group(); vm.add(brazos);
  let texTat = null;
  function construyeBrazos(izqZ, tat) {
    while (brazos.children.length) brazos.remove(brazos.children[0]);
    const hI = new V3(-0.005, -0.05, izqZ), cI = new V3(-0.2, -0.32, 0.1), hD = new V3(0.02, -0.07, 0.15), cD = new V3(0.13, -0.31, 0.12);
    tubo(0.046, 0.036, cI, hI, mPiel, brazos); tubo(0.062, 0.058, cI.clone().add(new V3(-0.06, -0.1, 0.12)), cI, mManga, brazos);
    tubo(0.048, 0.037, cD, hD, mPiel, brazos);
    tubo(0.064, 0.06, cD.clone().add(new V3(0.05, -0.1, 0.14)), cD, mManga, brazos);
    pieza(new THREE.SphereGeometry(0.036, 10, 8), mPiel, hI.x, hI.y - 0.01, hI.z, brazos).scale.set(1.1, 0.8, 1.4);
    pieza(new THREE.SphereGeometry(0.036, 10, 8), mPiel, hD.x, hD.y - 0.01, hD.z, brazos).scale.set(1.1, 0.8, 1.4);
    if (!tat || tat === 'ninguno') return;
    // calcomanía del tatuaje sobre la cara visible del antebrazo derecho
    const c = document.createElement('canvas'); c.width = 128; c.height = 128;
    Progreso.dibujaTatuaje(tat, c.getContext('2d'), 64, 64, 1.45);
    if (texTat) texTat.dispose(); texTat = new THREE.CanvasTexture(c); texTat.encoding = THREE.sRGBEncoding;
    const brazo = hI.clone().sub(cI), p = cI.clone().addScaledVector(brazo, 0.74);
    const camLocal = new V3(-0.22, 0.22, 0.42), z = camLocal.clone().sub(p).normalize();
    const eje = brazo.clone().normalize(), y = eje.clone().addScaledVector(z, -eje.dot(z)).normalize(), x = new V3().crossVectors(y, z);
    const dec = new THREE.Mesh(new THREE.PlaneGeometry(0.075, 0.075), new THREE.MeshLambertMaterial({ map: texTat, transparent: true, fog: false, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false }));
    dec.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
    dec.position.copy(p).addScaledVector(z, 0.05); brazos.add(dec);
  }
  const fogonazo = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.fogon, blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  fogonazo.scale.set(0.35, 0.35, 0.35); fogonazo.visible = false; vm.add(fogonazo);
  const luzDisparo = new THREE.PointLight(0xffc870, 0, 18, 2); cam.add(luzDisparo); luzDisparo.position.set(0, 0, -1);

  // ---------- estado ----------
  let G = null, pausado = true, jugando = false, misionIdx = 0, ARMAS = [], modelos = [];
  const P = { pos: new V3(), yaw: 0, pitch: 0, vida: 100, curas: 2, agach: false, mira: false, arma: 0, granadas: 3, avion: 0, muerto: false, esJugador: true, team: 'L', mov: 0, bob: 0, retroceso: 0 };
  const mov = { x: 0, y: 0 }, teclas = {};
  let disparando = false;
  const NOMBRES = ['Rivas', 'Castro', 'Ortega', 'Mendizábal', 'Ferrer', 'Quesada', 'Barrios', 'Lozano', 'Aranda'];

  function equiparArmas() {
    modelos.forEach(m => vm.remove(m.g));
    const E = Progreso.P.equipo, ids = [E.p].concat(E.s && E.s !== E.p ? [E.s] : []);
    ARMAS = ids.map(id => Object.assign({ id }, Progreso.ARMAS[id], { mun: Progreso.ARMAS[id].carg }));
    modelos = ids.map(id => { const m = modeloArma(id); m.g.visible = false; vm.add(m.g); return m; });
    construyeBrazos(modelos[0].izq, E.tat);
  }

  // ---------- partículas y trazadoras ----------
  const efectos = [], trazas = [];
  const geoTraza = new THREE.BoxGeometry(0.025, 0.025, 2.2), matTraza = new THREE.MeshBasicMaterial({ color: lin(0xffd27a), transparent: true, opacity: 0.75, blending: THREE.AdditiveBlending, depthWrite: false });
  function trazadora(de, a) {
    const d = a.clone().sub(de), L = d.length(); if (L < 4) return;
    const m = new THREE.Mesh(geoTraza, matTraza); m.position.copy(de); m.lookAt(a); scene.add(m);
    trazas.push({ m, dir: d.divideScalar(L), L, t: 0 });
  }
  function particula(pos, color, tam, vida, crece, vy, aditivo) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: aditivo ? T.fogon : T.humo, color: lin(color), transparent: true, depthWrite: false, blending: aditivo ? THREE.AdditiveBlending : THREE.NormalBlending }));
    sp.position.copy(pos); sp.scale.setScalar(tam); sp.material.rotation = Math.random() * 6; scene.add(sp);
    efectos.push({ sp, t: 0, vida, tam, crece, vy: vy || 0, adit: !!aditivo });
  }
  function polvo(p, n, tam) { for (let i = 0; i < (n || 2); i++) particula(p.clone().add(new V3(rnd(-.2, .2), rnd(0, .3), rnd(-.2, .2))), 0xc9a982, tam || 0.55, rnd(0.6, 1.1), 1.8, 0.45); }
  function sangre(p) { particula(p, 0x6a0c0c, 0.35, 0.4, 1.3, -0.6); }
  function explosionFx(p) {
    particula(p.clone().add(new V3(0, 1, 0)), 0xffd890, 6, 0.28, 2, 0, true);
    for (let i = 0; i < 12; i++) particula(p.clone().add(new V3(rnd(-2, 2), rnd(0, 2), rnd(-2, 2))), i < 4 ? 0x3a3128 : 0x9a8668, rnd(2, 4), rnd(1.8, 3.4), 2.2, rnd(0.5, 2.2));
  }
  function actualizaEfectos(dt) {
    for (let i = efectos.length - 1; i >= 0; i--) {
      const e = efectos[i]; e.t += dt; const k = e.t / e.vida;
      if (k >= 1) { scene.remove(e.sp); e.sp.material.dispose(); efectos.splice(i, 1); continue; }
      e.sp.scale.setScalar(e.tam * (1 + e.crece * k)); e.sp.material.opacity = (1 - k) * (e.adit ? 1 : 0.8); e.sp.position.y += e.vy * dt;
    }
    for (let i = trazas.length - 1; i >= 0; i--) {
      const t = trazas[i]; t.t += dt * 320; t.m.position.addScaledVector(t.dir, dt * 320);
      if (t.t >= t.L) { scene.remove(t.m); trazas.splice(i, 1); }
    }
  }

  // ---------- gritos ----------
  let gritoT = 0;
  function cartel(txt) { const el = $('grito'); el.textContent = txt; el.classList.remove('ver'); void el.offsetWidth; el.classList.add('ver'); }
  let avisoT = 0;
  function aviso(txt, s) { const el = $('aviso'); el.textContent = txt; el.style.opacity = 1; avisoT = s || 3; }
  function voz(clave, txt, g, pan, t0) { Snd.voz(clave, g, pan, t0); if (txt) cartel(txt); }
  function gritoViva() {
    if (!G || G.vivaCD > 0) return;
    const esp = G.vivaN++ % 2 === 0;
    voz(esp ? 'viva_espana' : 'viva_legion', esp ? '¡VIVA ESPAÑA!' : '¡VIVA LA LEGIÓN!');
    setTimeout(() => { if (G) { Snd.voz('coro_viva', 1); cartel('¡VIVA!'); } }, 1150);
    G.viva = 15; G.vivaCD = 22;
    aviso('Moral alta: la escuadra se lanza adelante y el enemigo se agacha', 3);
  }
  function gritoAliado(s) {
    const vivos = G.sold.filter(x => x.team === 'L' && !x.muerto); if (!vivos.length) return;
    s = s || vivos[Math.floor(Math.random() * vivos.length)];
    const op = [['viva_legion', '¡VIVA LA LEGIÓN!'], ['a_mi', '¡A MÍ LA LEGIÓN!'], ['viva_espana', '¡VIVA ESPAÑA!'], ['fuego', null], ['cubridme', null], ['adelante', null]];
    const o = op[Math.floor(Math.random() * op.length)];
    voz(o[0], o[1], 0.75, panDe(s.pos));
  }

  // ---------- soldados ----------
  function crearSoldado(team, x, z, k, extra) {
    const m = World.soldado(team, k);
    const s = Object.assign({ team, ...m, pos: new V3(x, H(x, z), z), yaw: 0, vida: team === 'L' ? 100 : 60, muerto: false, agach: false, estado: 'idle', t: rnd(0, 2), tirT: rnd(1, 3), visT: rnd(0, 0.8), obj: null, alerta: false, anim: Math.random() * 6, mueve: false, dest: null, cad: rnd(2.6, 4.2), muertoT: 0, rafaga: 0, apunta: 0, ciclo: Math.random() * 4, polvoT: 0 }, extra || {});
    scene.add(m.g); G.sold.push(s); return s;
  }
  function panDe(p) { const rel = Math.atan2(-(p.x - P.pos.x), -(p.z - P.pos.z)) - P.yaw; return clamp(-Math.sin(rel), -1, 1); }
  function dist2D(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }
  const _o = new V3(), _d = new V3();
  function ojo(s, out) { return out.set(s.pos.x, s.pos.y + (s.agach ? 1.05 : 1.6), s.pos.z); }
  function puedeVer(a, b) {
    ojo(a, _o); _d.set(b.pos.x, b.pos.y + (b.agach ? 1.0 : 1.4), b.pos.z).sub(_o);
    const L = _d.length(); if (L > 190) return false; _d.divideScalar(L);
    return World.obstaculo(_o, _d, L) >= L - 0.7;
  }
  function boca(s) { return new V3(s.pos.x - Math.sin(s.yaw) * 0.85, s.pos.y + (s.agach ? 1.0 : 1.42), s.pos.z - Math.cos(s.yaw) * 0.85); }

  function herir(s, dmg, desde, porJugador, cabeza) {
    if (s.muerto) return;
    if (s.esJugador) {
      P.vida -= dmg; G.minVida = Math.min(G.minVida, P.vida); Snd.impacto(); $('dano').style.opacity = clamp(dmg / 40, 0.35, 0.9);
      const rel = Math.atan2(-(desde.x - P.pos.x), -(desde.z - P.pos.z)) - P.yaw;
      const d = $('dir'); d.style.transform = 'rotate(' + (-rel) + 'rad)'; d.style.opacity = 1; G.dirT = 1.2;
      if (P.vida <= 0) { P.vida = 0; P.muerto = true; G.finT = 2.5; aviso('Has caído', 4); }
      return;
    }
    s.vida -= dmg;
    if (s.vida <= 0) {
      s.muerto = true; s.muertoT = 0; s.estado = 'muerto';
      if (s.team === 'E') {
        G.bajas++; if (porJugador) { G.bajasJ++; if (cabeza) G.cabezas++; }
        if (Math.random() < 0.25 && gritoT <= 0) { gritoAliado(); gritoT = 4; }
      } else { voz(Math.random() < 0.5 ? 'herido' : 'sanitario', null, 0.8, panDe(s.pos)); aviso('Ha caído el legionario ' + s.nombre, 2.5); }
    } else if (s.team === 'E') { s.estado = 'cubierto'; s.agach = true; s.t = rnd(1.5, 3); s.alerta = true; }
  }

  const _hit = new V3();
  function trazar(o, dir, maxD, equipo) {
    const dObs = World.obstaculo(o, dir, maxD);
    let mejor = null, mt = dObs, cabeza = false;
    for (const s of G.sold) {
      if (s.muerto || s.team === equipo) continue;
      const esf = s.agach ? [[1.27, 0.15, true], [0.95, 0.26], [0.65, 0.24], [0.3, 0.2]] : [[1.69, 0.15, true], [1.28, 0.26], [0.9, 0.24], [0.45, 0.2]];
      for (const e of esf) {
        const cx = s.pos.x - o.x, cy = s.pos.y + e[0] - o.y, cz = s.pos.z - o.z;
        const t = cx * dir.x + cy * dir.y + cz * dir.z; if (t < 0 || t > mt) continue;
        const px = cx - dir.x * t, py = cy - dir.y * t, pz = cz - dir.z * t;
        if (px * px + py * py + pz * pz < e[1] * e[1]) { mt = t; mejor = s; cabeza = !!e[2]; }
      }
    }
    return { s: mejor, t: mt, cabeza, obs: dObs };
  }
  function dirCamara(out, spread) { return out.set(rnd(-spread, spread), rnd(-spread, spread), -1).normalize().applyQuaternion(cam.quaternion); }

  function dispararJugador() {
    const a = ARMAS[P.arma];
    if (G.recT > 0 || G.cool > 0 || P.muerto) return;
    if (a.mun <= 0) { Snd.clic(); G.cool = 0.3; if (a.res > 0) recargar(); return; }
    a.mun--; G.cool = a.cad; G.tiros++;
    Snd.disparo(a.tipo); if (a.id === 'mauser') Snd.cerrojo();
    fogonazo.visible = true; fogonazo.material.rotation = Math.random() * 6; luzDisparo.intensity = 2.2; G.flashT = 0.05;
    P.retroceso += a.retro;
    const sp = (P.mira ? a.dispM : a.disp) * (P.mov > 0.2 ? 1.8 : 1) * (P.agach ? 0.7 : 1);
    cam.updateMatrixWorld(); dirCamara(_d, sp); cam.getWorldPosition(_o);
    const r = trazar(_o, _d, 260, 'L');
    _hit.copy(_o).addScaledVector(_d, r.t);
    if (r.s) { G.aciertos++; sangre(_hit); herir(r.s, a.dmg * (r.cabeza ? 2.5 : 1) * rnd(0.85, 1.1), P.pos, true, r.cabeza); }
    else if (r.t < 259) polvo(_hit, 2, 0.4);
    for (const s of G.sold) if (s.team === 'E' && !s.muerto && dist2D(s.pos, P.pos) < 130) s.alerta = true;
    if (a.mun === 0 && a.res > 0) setTimeout(() => G && !G.recT && ARMAS[P.arma] === a && a.mun === 0 && recargar(), 350);
  }
  function recargar() {
    const a = ARMAS[P.arma];
    if (G.recT > 0 || a.mun >= a.carg || a.res <= 0) return;
    G.recT = a.rec; Snd.recarga(); P.mira = false;
    if (Math.random() < 0.4) voz('recargando', null, 0.9);
  }
  function terminaRecarga() { const a = ARMAS[P.arma], n = Math.min(a.carg - a.mun, a.res); a.mun += n; a.res -= n; }
  function cambiarArma() {
    if (ARMAS.length < 2) { aviso('Compra una segunda arma en la armería', 2); return; }
    if (G.recT > 0) return;
    P.arma = (P.arma + 1) % ARMAS.length; G.cool = 0.5; P.mira = false; G.cambioT = 0.4; construyeBrazos(modelos[P.arma].izq, Progreso.P.equipo.tat);
  }
  function lanzarGranada() {
    if (P.granadas <= 0 || P.muerto) return;
    P.granadas--; voz('granada', null, 1);
    cam.getWorldPosition(_o); dirCamara(_d, 0);
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), World.mat(0x3d4a2c));
    m.position.copy(_o).addScaledVector(_d, 0.5); scene.add(m);
    G.proy.push({ tipo: 'granada', m, v: _d.clone().multiplyScalar(17).add(new V3(0, 4.5, 0)), t: 3.2, jug: true });
  }
  function explotar(p, radio, letal, jug) {
    explosionFx(p); const d = dist2D(p, P.pos); Snd.explosion(d, panDe(p)); G.temblor = Math.max(G.temblor, clamp(1.2 - d / 40, 0, 1));
    for (const s of G.sold) {
      if (s.muerto) continue; const ds = s.pos.distanceTo(p);
      if (ds < radio) herir(s, ds < letal ? 999 : 80 * (1 - ds / radio), p, jug);
      else if (s.team === 'E' && ds < radio * 3) { s.alerta = true; s.estado = 'cubierto'; s.agach = true; s.t = rnd(2, 4); }
    }
    if (d < radio) herir(P, Math.round((d < letal ? 85 : 55) * (1 - d / radio) + 10), p);
  }
  function curar() { if (P.curas > 0 && P.vida < 100 && !P.muerto) { P.curas--; P.vida = Math.min(100, P.vida + 50); aviso('Te vendas la herida (+50)', 2); } }
  function pedirAvion() {
    if (P.avion <= 0 || !G.fase || G.fase.tipo === 'reach') { aviso(P.avion <= 0 ? 'No queda apoyo aéreo' : 'Sin objetivo para la aviación', 2); return; }
    P.avion--;
    const f = G.fase, av = World.avion(); av.position.set(f.x + 30, H(f.x, f.z) + 70, f.z + 380); scene.add(av);
    G.avion = { m: av, f, soltadas: 0 };
    Snd.avion(); voz('aviacion', '¡AVIACIÓN!', 1);
    aviso('Un Heinkel bate la posición: aléjate de ella', 3);
  }

  // ---------- IA común ----------
  function apuntarHacia(s, p, dt, vel) {
    const obj = Math.atan2(-(p.x - s.pos.x), -(p.z - s.pos.z));
    let d = obj - s.yaw; while (d > Math.PI) d -= 6.283; while (d < -Math.PI) d += 6.283;
    s.yaw += clamp(d, -vel * dt, vel * dt);
  }
  function moverHacia(s, dest, vel, dt) {
    const dx = dest.x - s.pos.x, dz = dest.z - s.pos.z, d = Math.hypot(dx, dz);
    if (d < 0.6) { s.mueve = false; return true; }
    const px = s.pos.x, pz = s.pos.z;
    s.pos.x += dx / d * vel * dt; s.pos.z += dz / d * vel * dt; World.colisiona(s.pos, 0.35);
    if (Math.hypot(s.pos.x - px, s.pos.z - pz) < vel * dt * 0.3) { s.pos.x += -dz / d * vel * dt * (s.rodeo || 1); s.pos.z += dx / d * vel * dt * (s.rodeo || 1); World.colisiona(s.pos, 0.35); }
    s.mueve = true; s.velAnim = vel;
    apuntarHacia(s, dest, dt, 6);
    return false;
  }
  function elegirObjetivo(s) {
    if (s.team === 'E') {
      const cands = [];
      if (!P.muerto && dist2D(s.pos, P.pos) < 170) cands.push(P);
      for (const a of G.sold) if (a.team === 'L' && !a.muerto && dist2D(s.pos, a.pos) < 160) cands.push(a);
      cands.sort((a, b) => (dist2D(s.pos, a.pos) - (a === P ? 20 : 0)) - (dist2D(s.pos, b.pos) - (b === P ? 20 : 0)));
      for (let i = 0; i < Math.min(3, cands.length); i++) if (puedeVer(s, cands[i])) return cands[i];
      return null;
    }
    const cand = G.sold.filter(e => e.team === 'E' && !e.muerto && dist2D(s.pos, e.pos) < 150 && (e.alerta || dist2D(s.pos, e.pos) < 60)).sort((a, b) => dist2D(s.pos, a.pos) - dist2D(s.pos, b.pos));
    for (let i = 0; i < Math.min(3, cand.length); i++) if (puedeVer(s, cand[i])) return cand[i];
    return null;
  }
  function disparaIA(s, dt) {
    s.tirT -= dt; if (s.apunta > 0) { s.apunta -= dt; return; }
    if (s.tirT > 0 || !s.obj || s.obj.muerto) return;
    const fao = s.tipoArma === 'fao';
    if (fao) { if (s.rafaga <= 0) s.rafaga = 4; s.rafaga--; s.tirT = s.rafaga > 0 ? 0.12 : rnd(1.8, 2.8); }
    else s.tirT = s.cad * rnd(0.8, 1.25);
    const t = s.obj, d = dist2D(s.pos, t.pos), mz = boca(s), dj = dist2D(s.pos, P.pos);
    particula(mz, 0xffffff, 0.55, 0.07, 0.5, 0, true);
    if (s.team === 'E') Snd.disparo('enemigo', dj, panDe(s.pos)); else Snd.disparo(fao ? 'z45' : 'enemigo', Math.max(dj, 8), panDe(s.pos));
    let p;
    if (s.team === 'E') { p = (0.3 * Math.exp(-d / 55) + 0.03) * AJ.dif; if (G.viva > 0) p *= 0.6; if (t.agach) p *= 0.55; if (t === P && P.mov > 0.3) p *= 0.75; }
    else { p = (0.26 * Math.exp(-d / 60) + 0.05) * (G.viva > 0 ? 1.7 : 1); if (t.agach) p *= 0.6; if (fao) p *= 0.55; }
    const acierta = Math.random() < p;
    const dest = new V3(t.pos.x, t.pos.y + (t.agach ? 1 : 1.35), t.pos.z);
    if (!acierta) dest.add(new V3(rnd(-1.8, 1.8), rnd(-0.6, 1.2), rnd(-1.8, 1.8)));
    if (fao || Math.random() < 0.45) trazadora(mz, dest);
    if (acierta) { herir(t, t === P ? Math.round(rnd(16, 28) * AJ.dif) : (s.team === 'L' ? rnd(45, 90) : rnd(30, 60)), s.pos, false, false); if (t !== P) sangre(dest); }
    else if (t === P) {
      if (Math.random() < 0.5) Snd.silbido(panDe(s.pos));
      if (Math.random() < 0.6) polvo(new V3(P.pos.x + rnd(-2.5, 2.5), H(P.pos.x, P.pos.z) + rnd(0, 0.6), P.pos.z + rnd(-2.5, 2.5)), 1);
    } else polvo(new V3(dest.x, H(dest.x, dest.z) + 0.1, dest.z), 1, 0.35);
    if (t.team === 'E') t.alerta = true;
  }

  // postura articulada: correr, rodilla en tierra, apuntar
  function pose(s, dt) {
    const k = Math.min(1, dt * 10), L = (o, ax, v) => { o.rotation[ax] += (v - o.rotation[ax]) * k; };
    let bajada = 0;
    if (s.mueve) {
      s.anim += dt * (s.velAnim || 3) * 2.3; const a = Math.sin(s.anim);
      L(s.legL, 'x', a * 0.85); L(s.legR, 'x', -a * 0.85);
      L(s.rodL, 'x', -Math.max(0, Math.cos(s.anim)) * 1.2 - 0.1); L(s.rodR, 'x', -Math.max(0, -Math.cos(s.anim)) * 1.2 - 0.1);
      L(s.torso, 'x', s.agach ? -0.45 : -0.18);
      bajada = s.agach ? 0.2 : Math.abs(Math.cos(s.anim)) * 0.04;
    } else if (s.agach) {
      L(s.legL, 'x', 1.45); L(s.rodL, 'x', -1.45); L(s.legR, 'x', 0.15); L(s.rodR, 'x', -1.6); L(s.torso, 'x', -0.08);
      bajada = 0.42;
    } else { L(s.legL, 'x', 0); L(s.legR, 'x', 0); L(s.rodL, 'x', 0); L(s.rodR, 'x', 0); L(s.torso, 'x', 0); }
    const apunta = s.obj && !s.mueve;
    L(s.armR, 'x', apunta ? 1.25 : 0.55); L(s.codoR, 'x', apunta ? 0.55 : 0.9);
    L(s.armL, 'x', apunta ? 1.45 : 0.9); L(s.armL, 'z', apunta ? 0.5 : 0.35); L(s.armR, 'z', apunta ? -0.1 : -0.2); L(s.codoL, 'x', apunta ? 0.3 : 0.8);
    L(s.cabeza, 'x', apunta ? 0.12 : 0);
    s.arma.position.set(0.06, (apunta ? 1.47 : 1.2) - bajada * 0.9, apunta ? -0.3 : -0.22);
    L(s.arma, 'x', apunta ? 0 : 0.7); L(s.arma, 'z', apunta ? 0 : 0.35);
    return bajada;
  }

  function actualizaSoldado(s, dt) {
    if (s.muerto) { if (s.muertoT < 1) { s.muertoT += dt * 2.2; s.g.rotation.x = Math.min(1, s.muertoT) * 1.5; s.g.position.y = s.pos.y + 0.12 * Math.min(1, s.muertoT); } return; }
    s.visT -= dt;
    if (s.visT <= 0) { s.visT = rnd(0.45, 0.85); s.obj = elegirObjetivo(s); if (s.obj && s.team === 'E' && !s.alerta) { s.alerta = true; s.apunta = rnd(0.6, 1.2); } }
    s.mueve = false;
    if (s.team === 'E') iaEnemigo(s, dt); else iaAliado(s, dt);
    s.pos.y = H(s.pos.x, s.pos.z);
    const baj = pose(s, dt);
    s.g.position.set(s.pos.x, s.pos.y - baj, s.pos.z); s.g.rotation.y = s.yaw;
    if (s.mueve && dist2D(s.pos, P.pos) < 45) { s.polvoT -= dt; if (s.polvoT <= 0) { s.polvoT = 0.32; particula(new V3(s.pos.x, s.pos.y + 0.1, s.pos.z), 0xc9a982, 0.35, 0.7, 1.5, 0.3); } }
  }

  function iaEnemigo(s, dt) {
    s.t -= dt;
    switch (s.estado) {
      case 'idle': s.agach = false; if (s.alerta) { s.estado = 'cubierto'; s.t = rnd(0.3, 1.2); } else if (s.t <= 0) { s.yaw = s.spotYaw + rnd(-0.6, 0.6); s.t = rnd(2, 5); } break;
      case 'cubierto': s.agach = true; if (s.t <= 0 && s.alerta) { s.estado = 'asomado'; s.t = rnd(1.6, 3.4) * (0.7 + 0.3 * AJ.dif); s.apunta = rnd(0.35, 0.8) / AJ.dif; } break;
      case 'asomado':
        s.agach = s.muro ? false : s.agach;
        if (s.obj) { apuntarHacia(s, s.obj.pos, dt, 4); disparaIA(s, dt); }
        if (s.t <= 0) { s.estado = 'cubierto'; s.t = rnd(1.2, 3.2) / AJ.dif; }
        break;
      case 'avanza':
        s.agach = false;
        if (moverHacia(s, s.dest, s.vel || 3.2, dt)) { s.estado = 'asomado'; s.muro = false; s.agach = true; s.t = rnd(2, 4); }
        else if (s.t <= 0) { s.estado = 'para'; s.t = rnd(2, 3.5); s.apunta = rnd(0.4, 0.8); }
        break;
      case 'para': s.agach = true; if (s.obj) { apuntarHacia(s, s.obj.pos, dt, 4); disparaIA(s, dt); } if (s.t <= 0) { s.estado = 'avanza'; s.t = rnd(3, 6); } break;
      case 'huye': s.agach = false; if (moverHacia(s, s.dest, 4.5, dt)) { s.muerto = true; scene.remove(s.g); } break;
    }
  }

  // ---------- IA de la escuadra: avance por saltos de cobertura ----------
  const huecos = [[-3, 3], [3, 3.5], [-6, 6], [6, 6.5], [-1.5, 8.5], [9, 9], [-9, 9.5], [1.5, 11]];
  function puntoCobertura(x, z, ex, ez) {
    const c = World.coberturaCerca(x, z, 6);
    if (!c) return { x, z };
    const dx = c.x - ex, dz = c.z - ez, d = Math.hypot(dx, dz) || 1;
    return { x: c.x + dx / d * (c.r + 0.55), z: c.z + dz / d * (c.r + 0.55) };
  }
  function enemigosVivos() { return G.sold.filter(e => e.team === 'E' && !e.muerto && e.fase === G.faseI); }
  function iaAliado(s, dt) {
    const f = G.fase, enem = f ? enemigosVivos() : [];
    let modo = 'formacion';
    if (f && f.tipo === 'take' && enem.length) modo = 'asalto';
    else if (f && f.tipo === 'ambush' && G.disparada && enem.length) modo = 'asalto';
    else if (f && f.tipo === 'hold' && Math.hypot(P.pos.x - f.x, P.pos.z - f.z) < 60) modo = 'defensa';
    if (modo !== s.modo) { s.modo = modo; s.cp = null; s.salto = 'cubre'; s.t = rnd(0.2, 2) + (s.hueco % 2) * 2.5; }

    if (modo === 'formacion') {
      const hx = huecos[s.hueco % huecos.length], sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
      const dx = P.pos.x + hx[0] * cy + hx[1] * sy, dz = P.pos.z - hx[0] * sy + hx[1] * cy, d = Math.hypot(dx - s.pos.x, dz - s.pos.z);
      if (d > (s.obj ? 9 : 2.5)) { moverHacia(s, { x: dx, z: dz }, 4.6 * (d > 20 ? 1.3 : 1), dt); s.agach = false; } else s.agach = !!s.obj;
      if (s.obj) { if (!s.mueve) apuntarHacia(s, s.obj.pos, dt, 5); disparaIA(s, dt); }
      else if (!s.mueve) s.yaw += (P.yaw - s.yaw) * Math.min(1, dt * 2);
      return;
    }
    if (modo === 'defensa') {
      if (!s.cp) s.cp = { x: f.x + ((s.hueco % 7) - 3) * 3.1 + (s.hueco >= 7 ? 1.5 : 0), z: f.z - 3.6 };
      if (!s.enSitio) { if (moverHacia(s, s.cp, 4.6, dt)) s.enSitio = true; else { s.agach = false; return; } }
      tiroteoCubierto(s, dt, { x: f.x, z: f.z - 60 });
      return;
    }
    s.enSitio = false;
    let ox = f.x, oz = f.z;
    if (f.tipo === 'ambush') { ox = enem.reduce((a, e) => a + e.pos.x, 0) / enem.length; oz = enem.reduce((a, e) => a + e.pos.z, 0) / enem.length; }
    const final = G.asalto || enem.length <= 2 || (G.viva > 0 && enem.length <= 4);
    if (s.salto === 'cubre') {
      tiroteoCubierto(s, dt, { x: ox, z: oz });
      s.t -= dt * (G.viva > 0 ? 1.8 : 1);
      if (s.t <= 0) {
        const d = Math.hypot(s.pos.x - ox, s.pos.z - oz), dJ = Math.hypot(P.pos.x - ox, P.pos.z - oz);
        const d2 = final ? 0 : Math.max(f.tipo === 'ambush' ? 12 : 15, d - rnd(10, 15));
        if (!final && d2 < dJ - 32) { s.t = rnd(2, 3); return; } // no se adelanta demasiado al jugador
        const ax = (s.pos.x - ox) / (d || 1), az = (s.pos.z - oz) / (d || 1), px = -az, pz = ax, lat = ((s.hueco % 7) - 3) * (final ? 1.8 : 4.5);
        const x = ox + ax * d2 + px * lat, z = oz + az * d2 + pz * lat;
        s.cp = final ? { x, z } : puntoCobertura(x, z, ox, oz);
        s.salto = 'salta'; s.rodeo = Math.random() < 0.5 ? 1 : -1; s.t = 0;
        if (Math.random() < 0.3 && gritoT <= 0) { voz(final ? 'a_mi' : Math.random() < 0.5 ? 'cubridme' : 'adelante', final ? '¡A MÍ LA LEGIÓN!' : null, 0.7, panDe(s.pos)); gritoT = 3; }
      }
    } else {
      s.agach = false; s.t -= dt;
      if (moverHacia(s, s.cp, final ? 4.9 : 4.4, dt) || s.t < -9) { s.salto = 'cubre'; s.t = final ? rnd(1, 2) : rnd(4.5, 8); s.ciclo = 0; }
    }
  }
  // agachado tras la cobertura, se asoma a disparar y vuelve a cubrirse
  function tiroteoCubierto(s, dt, mira) {
    s.ciclo += dt;
    s.agach = (s.ciclo % 4.6) > 2.6;
    if (s.obj && !s.agach) { apuntarHacia(s, s.obj.pos, dt, 5); disparaIA(s, dt); }
    else apuntarHacia(s, mira, dt, 3);
  }

  // ---------- misiones y fases ----------
  function limpiarEscena() { scene.traverse(o => { if (o.geometry && o.geometry.dispose && o.parent === scene && !o.isInstancedMesh) o.geometry.dispose(); }); efectos.length = 0; trazas.length = 0; }
  function construir(m) {
    limpiarEscena(); scene = new THREE.Scene(); World.build(m, scene); scene.add(cam);
    const mk = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.marca, depthTest: false, transparent: true, sizeAttenuation: false, fog: false }));
    mk.scale.set(0.035, 0.035, 1); mk.renderOrder = 10; scene.add(mk);
    return mk;
  }
  function empezar(i) {
    misionIdx = i; const m = MISIONES[i], v = Progreso.ventajas();
    m.fases.forEach(f => { delete f._spots; });
    const marca = construir(m), nAli = m.aliados + v.esc;
    G = { m, sold: [], proy: [], faseI: -1, fase: null, marca, bajas: 0, bajasJ: 0, cabezas: 0, tiros: 0, aciertos: 0, minVida: 100, recT: 0, cool: 0, viva: 0, vivaCD: 0, vivaN: 0, temblor: 0, flashT: 0, dirT: 0, finT: 0, cambioT: 0, t: 0, gritoBat: rnd(10, 16), flareT: 4, avion: null, asalto: false, fin: false, aliadosIni: nAli, revivido: false, pedido: 0 };
    equiparArmas();
    Object.assign(P, { yaw: 0, pitch: -0.02, vida: 100, curas: 2 + v.cura, agach: false, mira: false, arma: 0, granadas: 3 + v.gran, avion: (m.avion || 0) + (m.avion ? v.avion : 0), muerto: false, retroceso: 0 });
    P.pos.set(m.inicio[0], 0, m.inicio[1]); P.pos.y = H(P.pos.x, P.pos.z);
    for (let k = 0; k < nAli; k++) {
      const h = huecos[k % huecos.length], s = crearSoldado('L', P.pos.x + h[0], P.pos.z + h[1], k, { hueco: k, cad: rnd(2.2, 3.4), nombre: NOMBRES[k % NOMBRES.length] });
      if (k === 1) s.tipoArma = 'fao';
    }
    jugando = true; pausado = false;
    ['menu', 'parte', 'fin', 'revivir'].forEach(id => $(id).hidden = true);
    $('hud').hidden = $('mandos').hidden = false;
    siguienteFase();
    Snd.corneta(m.noche ? 'diana' : 'ataque');
    setTimeout(() => G && G.m === m && voz('coro_luchar', '¡LEGIONARIOS, A LUCHAR!', 0.9), 2600);
  }
  function siguienteFase() {
    G.faseI++;
    const f = G.fase = G.m.fases[G.faseI];
    if (!f) return victoria();
    G.faseT = 0; G.disparada = false; G.asalto = false; G.avisoEnemigo = false; G.desborde = 0;
    if (f.tipo === 'take') {
      const spots = f._spots.slice().sort(() => Math.random() - 0.5);
      for (let k = 0; k < f.n; k++) {
        const sp = spots[k % spots.length], off = k >= spots.length ? 2.5 : 0;
        const s = crearSoldado('E', sp.x + rnd(-off, off), sp.z + rnd(-off, off), k, { fase: G.faseI, spotYaw: sp.yaw, muro: sp.muro && off === 0, estado: 'idle' });
        s.yaw = sp.yaw; if (k % 5 === 3) s.tipoArma = 'fao';
      }
      aviso(f.nom, 3);
      if (G.faseI > 0) { Snd.corneta('ataque'); setTimeout(() => G && voz('adelante', '¡ADELANTE, LEGIONARIOS!'), 1700); }
    } else if (f.tipo === 'hold') { G.holdT = f.t; G.oleada = 3; aviso(f.nom + ': ponte tras los sacos', 3.5); }
    else aviso(f.nom, 3);
  }
  function faseCumplida(txt) {
    const f = G.fase; G.fase = null;
    if (f.tipo !== 'reach') {
      voz(f.tipo === 'take' ? 'tomada' : 'viva_legion', f.tipo === 'take' ? '¡POSICIÓN TOMADA!' : '¡VIVA LA LEGIÓN!');
      setTimeout(() => { if (!G) return; const e = Math.random() < 0.5; Snd.voz(e ? 'coro_espana' : 'coro_legion', 1); cartel(e ? '¡VIVA ESPAÑA!' : '¡VIVA LA LEGIÓN!'); }, 1500);
    }
    if (txt) aviso(txt, 3);
    setTimeout(() => { if (G && !G.fin) siguienteFase(); }, 3800);
  }
  function actualizaFase(dt) {
    const f = G.fase; if (!f) return;
    G.faseT += dt;
    const dObj = Math.hypot(P.pos.x - f.x, P.pos.z - f.z);
    if (f.tipo === 'take') {
      const n = enemigosVivos();
      if (!G.avisoEnemigo && n.some(e => e.alerta)) { G.avisoEnemigo = true; voz('enemigo', null, 0.9, 0); }
      if (!G.asalto && dObj < 38 && n.length) { G.asalto = true; voz('asalto', '¡AL ASALTO!'); setTimeout(() => G && voz('a_mi', null, 0.8, -0.4), 1300); }
      const aliCerca = G.sold.some(s => s.team === 'L' && !s.muerto && Math.hypot(s.pos.x - f.x, s.pos.z - f.z) < 16);
      if (n.length && n.length <= 2 && (dObj < 20 || aliCerca)) { G.desborde += dt; if (G.desborde > 8) { for (const s of n) { s.estado = 'huye'; s.dest = { x: s.pos.x + rnd(-30, 30), z: s.pos.z - 150 }; s.fase = -1; } aviso('Los últimos defensores huyen', 2.5); } } else G.desborde = 0;
      G.obj2 = n.length ? 'Enemigos en la posición: ' + n.length : 'Ocupa la posición';
      if (!n.length && dObj < 16) faseCumplida('Posición asegurada');
    } else if (f.tipo === 'hold') {
      const dentro = dObj < 22;
      if (dentro) G.holdT -= dt;
      G.oleada -= dt;
      if (G.oleada <= 0 && G.holdT > 8) {
        G.oleada = f.cada;
        for (let k = 0; k < f.n; k++) {
          const x = f.x + rnd(-60, 60), z = f.z - rnd(85, 125);
          const s = crearSoldado('E', x, z, k + G.sold.length, { fase: G.faseI, estado: 'avanza', alerta: true, dest: { x: f.x + rnd(-25, 25), z: f.z - rnd(18, 34) }, vel: rnd(2.6, 3.6), t: rnd(2, 5) });
          s.yaw = 0; if (Math.random() < 0.15) s.tipoArma = 'fao';
        }
        if (G.faseT < 5) voz('enemigo', null, 0.9);
      }
      const mm = Math.max(0, Math.ceil(G.holdT));
      G.obj2 = (dentro ? 'Resiste: ' : 'Vuelve a la posición · ') + Math.floor(mm / 60) + ':' + String(mm % 60).padStart(2, '0');
      if (G.holdT <= 0) { for (const s of enemigosVivos()) { s.estado = 'huye'; s.dest = { x: s.pos.x + rnd(-20, 20), z: s.pos.z - 160 }; s.fase = -1; } faseCumplida('El enemigo se retira'); }
    } else if (f.tipo === 'ambush') {
      if (!G.disparada && (dObj < 45 || P.pos.z < f.z + 20)) {
        G.disparada = true;
        f._spots.forEach((sp, k) => { const s = crearSoldado('E', sp.x, sp.z, k + 3, { fase: G.faseI, estado: 'cubierto', alerta: true, muro: true, t: rnd(0.2, 1.5), spotYaw: sp.yaw }); s.yaw = sp.yaw; if (k % 4 === 2) s.tipoArma = 'fao'; });
        voz('emboscada', '¡EMBOSCADA!'); aviso('¡Cuerpo a tierra! Busca cobertura', 3);
      }
      const n = G.disparada ? enemigosVivos().length : -1;
      G.obj2 = n < 0 ? 'Avanza con cuidado' : 'Enemigos: ' + n;
      if (G.disparada && n === 0) faseCumplida('Emboscada rechazada');
    } else if (f.tipo === 'reach') { G.obj2 = 'Sin enemigos a la vista'; if (dObj < 12) faseCumplida('Has alcanzado la columna'); }
  }
  function resultado(ok) {
    const vivos = G.sold.filter(s => s.team === 'L' && !s.muerto).length;
    return Progreso.terminar({ ok, mision: G.m.id, dif: AJ.dif, bajas: G.bajas, bajasJ: G.bajasJ, cabezas: G.cabezas, tiros: G.tiros, aciertos: G.aciertos, vivos, aliadosIni: G.aliadosIni, minVida: G.minVida, vidaFinal: P.vida, tiempo: G.t });
  }
  function victoria() {
    G.fin = true;
    Snd.corneta('victoria'); setTimeout(() => G && Snd.voz('coro_legion', 1), 2400);
    setTimeout(() => finPantalla(true), 3500);
  }
  async function finPantalla(ok) {
    jugando = false; pausado = true; $('hud').hidden = $('mandos').hidden = true;
    if (document.pointerLockElement) document.exitPointerLock();
    const res = resultado(ok), m = G.m;
    await Progreso.Anuncios.intersticial();
    $('fDato').textContent = m.dato;
    $('fTit').textContent = ok ? 'Misión cumplida: ' + m.tit : 'Has caído en combate';
    $('fTxt').innerHTML = '<p>' + (ok ? m.historia : 'La misión ha fracasado. Vuelve a intentarlo.') + '</p>';
    UI.fin(res, ok);
    $('bSig').hidden = !ok || misionIdx >= MISIONES.length - 1;
    $('fin').hidden = false;
  }
  // al caer: volver al combate una vez por misión a cambio de un vídeo
  function ofrecerRevivir() {
    if (G.revivido || Progreso.Anuncios.quedanHoy() <= 0) return finPantalla(false);
    pausado = true; $('mandos').hidden = true; $('revivir').hidden = false;
    $('bRevivir').onclick = async () => {
      $('revivir').hidden = true;
      if (await Progreso.Anuncios.recompensado()) { G.revivido = true; P.muerto = false; P.vida = 60; P.pitch = 0; G.finT = 0; pausado = false; $('mandos').hidden = false; aviso('¡Arriba, legionario!', 2); voz('a_mi', '¡A MÍ LA LEGIÓN!'); }
      else finPantalla(false);
    };
    $('bRendirse').onclick = () => { $('revivir').hidden = true; finPantalla(false); };
  }

  // ---------- bucle ----------
  const _f = new V3();
  function actualizaJugador(dt) {
    if (P.muerto) { P.pitch = Math.max(P.pitch - dt * 0.6, -0.5); return; }
    let mx = mov.x, my = mov.y;
    if (teclas.KeyW) my -= 1; if (teclas.KeyS) my += 1; if (teclas.KeyA) mx -= 1; if (teclas.KeyD) mx += 1;
    const ml = Math.hypot(mx, my); if (ml > 1) { mx /= ml; my /= ml; }
    const vel = P.agach ? 1.8 : P.mira ? 2.3 : 4.3, sy = Math.sin(P.yaw), cy = Math.cos(P.yaw);
    P.pos.x += (mx * cy + my * sy) * vel * dt; P.pos.z += (-mx * sy + my * cy) * vel * dt;
    World.colisiona(P.pos, 0.4);
    P.pos.x = clamp(P.pos.x, -150, 150); P.pos.z = clamp(P.pos.z, -255, 262); P.pos.y = H(P.pos.x, P.pos.z);
    P.mov = Math.min(1, ml); if (P.mov > 0.1) P.bob += dt * vel * 2.2;
  }
  function actualizaArma(dt) {
    const a = ARMAS[P.arma];
    G.cool -= dt;
    if (G.recT > 0) { G.recT -= dt; if (G.recT <= 0) { G.recT = 0; terminaRecarga(); } }
    cam.updateMatrixWorld(); cam.getWorldPosition(_o); _f.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const r = trazar(_o, _f, 220, 'L'); G.apuntado = !!r.s;
    $('mira').classList.toggle('blanco', G.apuntado);
    const auto = AJ.auto && tactil && G.apuntado && !app.classList.contains('raton');
    if (G.pedido > 0) G.pedido -= dt;
    const quiere = (disparando && (a.auto || !G.disparoHecho)) || G.pedido > 0 || auto;
    if (quiere && G.cool <= 0 && G.recT <= 0) { dispararJugador(); G.disparoHecho = true; G.pedido = 0; }
    if (!disparando && G.pedido <= 0) G.disparoHecho = false;
    if (G.flashT > 0) { G.flashT -= dt; if (G.flashT <= 0) { fogonazo.visible = false; luzDisparo.intensity = 0; } }
  }
  function actualizaProyectiles(dt) {
    for (let i = G.proy.length - 1; i >= 0; i--) {
      const p = G.proy[i]; p.t -= dt;
      p.v.y -= 9.8 * dt; p.m.position.addScaledVector(p.v, dt);
      const h = H(p.m.position.x, p.m.position.z);
      if (p.m.position.y < h + 0.07) { p.m.position.y = h + 0.07; p.v.y = Math.abs(p.v.y) * 0.3; p.v.x *= 0.5; p.v.z *= 0.5; if (p.tipo === 'bomba') p.t = 0; }
      if (p.t <= 0) { scene.remove(p.m); G.proy.splice(i, 1); explotar(p.m.position.clone(), p.tipo === 'bomba' ? 13 : 8, p.tipo === 'bomba' ? 6 : 3.5, p.jug); }
    }
    const av = G.avion;
    if (av) {
      av.m.position.z -= 62 * dt;
      if (av.soltadas < 4 && av.m.position.z < av.f.z + 40 - av.soltadas * 9) {
        av.soltadas++;
        const b = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1.2, 8), World.mat(0x333333)); b.rotation.x = Math.PI / 2;
        b.position.copy(av.m.position).add(new V3(rnd(-6, 6), -1, 0)); scene.add(b);
        G.proy.push({ tipo: 'bomba', m: b, v: new V3(rnd(-3, 3) - 0.6, -2, -48), t: 10, jug: true });
      }
      if (av.m.position.z < av.f.z - 420) { scene.remove(av.m); G.avion = null; }
    }
  }
  function actualizaCamara(dt) {
    const a = ARMAS[P.arma], md = modelos[P.arma];
    P.retroceso *= Math.pow(0.0005, dt); G.temblor = Math.max(0, G.temblor - dt * 1.5);
    const alt = P.muerto ? 0.35 : (P.agach ? 1.05 : 1.62);
    G.alt = G.alt == null ? alt : G.alt + (alt - G.alt) * Math.min(1, dt * 10);
    const bob = Math.sin(P.bob) * 0.035 * P.mov;
    cam.position.set(P.pos.x, P.pos.y + G.alt + bob, P.pos.z);
    const tb = G.temblor * 0.03;
    cam.rotation.set(clamp(P.pitch + P.retroceso, -1.35, 1.35) + rnd(-tb, tb), P.yaw + rnd(-tb, tb), P.muerto ? 0.6 : 0);
    const fov = P.mira ? 42 : 72; cam.fov += (fov - cam.fov) * Math.min(1, dt * 12); cam.updateProjectionMatrix();
    modelos.forEach((m, i) => m.g.visible = i === P.arma && !P.muerto); brazos.visible = !P.muerto;
    const rec = G.recT > 0 ? Math.sin(Math.min(1, (a.rec - G.recT) / a.rec) * Math.PI) : 0;
    const cambio = G.cambioT > 0 ? (G.cambioT -= dt, G.cambioT / 0.4) : 0;
    const tx = P.mira ? 0 : 0.22, ty = (P.mira ? -0.085 : -0.22) - rec * 0.25 - cambio * 0.3 + Math.sin(P.bob * 0.5) * 0.01 * P.mov, tz = P.mira ? -0.27 : -0.42;
    vm.position.x += (tx - vm.position.x) * Math.min(1, dt * 14); vm.position.y += (ty - vm.position.y) * Math.min(1, dt * 14); vm.position.z += (tz + P.retroceso * 0.8 - vm.position.z) * Math.min(1, dt * 20);
    vm.rotation.set(rec * 0.6 + P.retroceso * 2, P.mira ? 0 : 0.04, rec * 0.4);
    fogonazo.position.set(0, 0.03, md.muzz);
    const R = World.refs; R.sun.position.copy(P.pos).addScaledVector(R.solDir, 120); R.sun.target.position.copy(P.pos);
    if (R.bandera) { const p = R.bandera.geometry.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i) + 1.2; p.setZ(i, Math.sin(x * 2.4 - G.t * 6) * 0.12 * x); } p.needsUpdate = true; }
    if (G.m.noche) {
      G.flareT -= dt;
      if (G.flareT <= 0) { G.flareT = rnd(16, 24); const f = G.fase || G.m.fases[0]; R.flare.position.set(f.x + rnd(-30, 30), H(f.x, f.z) + 75, f.z + rnd(-20, 30)); G.flareVida = 14; }
      if (G.flareVida > 0) { G.flareVida -= dt; R.flare.position.y -= dt * 3.2; R.flare.intensity = (G.flareVida > 1 ? 2.2 : G.flareVida * 2.2) * (0.85 + Math.random() * 0.15); } else R.flare.intensity = 0;
    }
  }
  function actualizaHUD(dt) {
    const a = ARMAS[P.arma];
    $('tVida').textContent = Math.ceil(P.vida); $('vida').firstElementChild.style.width = P.vida + '%';
    $('tCuras').textContent = P.curas; $('tBajas').textContent = G.bajas;
    $('tEsc').textContent = G.sold.filter(s => s.team === 'L' && !s.muerto).length;
    $('tMun').textContent = G.recT > 0 ? '··' : a.mun; $('tRes').textContent = a.res; $('tArma').textContent = a.nom; $('tGran').textContent = P.granadas;
    $('bGran').disabled = P.granadas <= 0; $('bCura').disabled = P.curas <= 0; $('bAvion').disabled = P.avion <= 0; $('bAvion').hidden = !(G.m.avion > 0);
    $('bViva').disabled = G.vivaCD > 0; $('bViva').textContent = G.vivaCD > 0 ? Math.ceil(G.vivaCD) + 's' : '¡VIVA!';
    $('bAgach').classList.toggle('on', P.agach); $('bMira').classList.toggle('on', P.mira);
    const f = G.fase;
    if (f) {
      const dx = f.x - P.pos.x, dz = f.z - P.pos.z, d = Math.hypot(dx, dz);
      $('tObj').textContent = f.nom + ' · ' + Math.round(d) + ' m'; $('tObj2').textContent = G.obj2 || '';
      $('flecha').style.transform = 'rotate(' + (-(Math.atan2(-dx, -dz) - P.yaw)) + 'rad)';
      G.marca.visible = d > 12; G.marca.position.set(f.x, H(f.x, f.z) + 7, f.z);
    } else G.marca.visible = false;
    const dano = $('dano'); let op = Math.max(0, (parseFloat(dano.style.opacity) || 0) - dt * 0.9);
    if (P.vida < 30 && !P.muerto) op = Math.max(op, 0.25 + Math.sin(G.t * 4) * 0.1);
    dano.style.opacity = op;
    if (G.dirT > 0) { G.dirT -= dt; $('dir').style.opacity = Math.max(0, G.dirT); }
    if (avisoT > 0) { avisoT -= dt; if (avisoT <= 0) $('aviso').style.opacity = 0; }
  }

  let ultimo = performance.now(), menuT = 0;
  function bucle(ahora) {
    requestAnimationFrame(bucle);
    const dt = Math.min(0.05, (ahora - ultimo) / 1000); const ultimoReal = ultimo; ultimo = ahora;
    if (jugando && !pausado && G) {
      G.t += dt; gritoT -= dt; G.viva = Math.max(0, G.viva - dt); G.vivaCD = Math.max(0, G.vivaCD - dt);
      actualizaJugador(dt); actualizaArma(dt);
      for (const s of G.sold) actualizaSoldado(s, dt);
      actualizaProyectiles(dt); actualizaFase(dt); actualizaEfectos(dt);
      const combate = G.sold.some(s => s.team === 'E' && !s.muerto && s.alerta);
      G.gritoBat -= dt;
      if (combate && G.gritoBat <= 0) { G.gritoBat = rnd(11, 19); gritoAliado(); }
      if (G.finT > 0) { G.finT -= dt; if (G.finT <= 0) ofrecerRevivir(); }
      actualizaCamara(dt); actualizaHUD(dt);
      // calidad automática: si en los primeros segundos no llega a 28 fps, pasa a modo rendimiento
      if (AJ.calAuto && AJ.calidad === 'alta' && G.t > 2 && G.t < 8) { G.fpsN = (G.fpsN || 0) + 1; G.fpsT = (G.fpsT || 0) + (ahora - ultimoReal) / 1000; if (G.fpsN > 90 && G.fpsN / G.fpsT < 28) { AJ.calidad = 'baja'; AJ.calAuto = false; guardarAJ(); aplicaCalidad(); redim(); aviso('Gráficos en modo rendimiento para que vaya fluido', 3); } }
    } else if (!jugando) {
      menuT += dt * 0.04; const r = 70;
      cam.position.set(Math.sin(menuT) * r, H(Math.sin(menuT) * r, Math.cos(menuT) * r + 40) + 22, Math.cos(menuT) * r + 40);
      cam.rotation.set(-0.18, menuT + Math.PI, 0); cam.fov = 60; cam.updateProjectionMatrix();
    }
    vm.visible = jugando;
    renderer.render(scene, cam);
  }

  // ---------- menús ----------
  function abrirParte(i) {
    Snd.init(); misionIdx = i; const m = MISIONES[i];
    $('pDato').textContent = m.dato; $('pTit').textContent = m.tit;
    $('pTxt').innerHTML = m.parte.map(p => '<p>' + p + '</p>').join('');
    $('menu').hidden = true; $('parte').hidden = false;
  }
  function alMenu() {
    jugando = false; pausado = true; G = null;
    ['hud', 'mandos', 'parte', 'fin', 'pausa', 'ajustes', 'revivir'].forEach(id => $(id).hidden = true);
    construir(MISIONES[2]); UI.tab('campana'); $('menu').hidden = false;
    if (document.pointerLockElement) document.exitPointerLock();
  }
  function pausar(v) {
    if (!jugando) return; pausado = v; $('pausa').hidden = !v; $('mandos').hidden = v;
    disparando = false; mov.x = mov.y = 0; toques.clear(); $('palanca').hidden = true;
    if (v && document.pointerLockElement) document.exitPointerLock();
  }
  let ajDesde = 'menu';
  function abrirAjustes(desde) {
    ajDesde = desde; $(desde).hidden = true; $('ajustes').hidden = false;
    $('aSens').value = AJ.sens; $('aVol').value = AJ.vol; $('aAuto').checked = AJ.auto; $('aZurdo').checked = AJ.zurdo; $('aDif').value = String(AJ.dif); $('aCal').value = AJ.calidad;
  }
  $('aSens').oninput = e => AJ.sens = +e.target.value;
  $('aVol').oninput = e => { AJ.vol = +e.target.value; Snd.setVol(AJ.vol); };
  $('aAuto').onchange = e => AJ.auto = e.target.checked;
  $('aZurdo').onchange = e => { AJ.zurdo = e.target.checked; app.classList.toggle('zurdo', AJ.zurdo); };
  $('aDif').onchange = e => AJ.dif = +e.target.value;
  $('aCal').onchange = e => { AJ.calidad = e.target.value; AJ.calAuto = false; aplicaCalidad(); redim(); };
  $('bAjOk').onclick = () => { guardarAJ(); $('ajustes').hidden = true; $(ajDesde).hidden = false; };
  $('bAjustes').onclick = () => abrirAjustes('menu');
  $('bAj2').onclick = () => abrirAjustes('pausa');
  $('bCombate').onclick = () => { Snd.init(); Snd.setVol(AJ.vol); $('parte').hidden = true; empezar(misionIdx); };
  $('bVolver').onclick = () => { $('parte').hidden = true; $('menu').hidden = false; };
  $('bSig').onclick = () => { $('fin').hidden = true; abrirParte(misionIdx + 1); };
  $('bRep').onclick = () => { $('fin').hidden = true; empezar(misionIdx); };
  $('bMenu').onclick = alMenu;
  $('bSeguir').onclick = () => pausar(false);
  $('bSalir').onclick = alMenu;

  // ---------- mandos táctiles ----------
  const capa = $('mandos'), pal = $('palanca'), palI = pal.firstElementChild;
  const toques = new Map();
  function mirar(dx, dy, k) { const f = (k || 0.0048) * AJ.sens * (P.mira ? 0.45 : 1); P.yaw -= dx * f; P.pitch = clamp(P.pitch - dy * f, -1.25, 1.25); }
  capa.addEventListener('pointerdown', e => {
    if (e.target.closest('.bt')) return;
    Snd.init();
    if (e.pointerType === 'mouse') {
      app.classList.add('raton');
      if (!document.pointerLockElement && capa.requestPointerLock) { try { const r = capa.requestPointerLock(); if (r && r.catch) r.catch(() => {}); } catch (er) {} }
      if (e.button === 0) { disparando = true; if (G) G.pedido = 0.3; } else if (e.button === 2) P.mira = true;
      toques.set(e.pointerId, { rol: 'raton', x: e.clientX, y: e.clientY });
      return;
    }
    const izq = AJ.zurdo ? e.clientX > innerWidth * 0.55 : e.clientX < innerWidth * 0.45;
    if (izq && ![...toques.values()].some(t => t.rol === 'mover')) {
      toques.set(e.pointerId, { rol: 'mover', x0: e.clientX, y0: e.clientY });
      pal.hidden = false; pal.style.left = e.clientX + 'px'; pal.style.top = e.clientY + 'px'; palI.style.transform = '';
    } else toques.set(e.pointerId, { rol: 'mirar', x: e.clientX, y: e.clientY });
  });
  addEventListener('pointermove', e => {
    const t = toques.get(e.pointerId); if (!t) return;
    if (t.rol === 'mover') {
      let dx = (e.clientX - t.x0) / 50, dy = (e.clientY - t.y0) / 50; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; }
      mov.x = dx; mov.y = dy; palI.style.transform = 'translate(' + dx * 36 + 'px,' + dy * 36 + 'px)';
    } else if (t.rol === 'mirar' || t.mira || (t.rol === 'raton' && !document.pointerLockElement)) { mirar(e.clientX - t.x, e.clientY - t.y); t.x = e.clientX; t.y = e.clientY; }
  });
  function soltar(e) {
    const t = toques.get(e.pointerId); if (!t) return; toques.delete(e.pointerId);
    if (t.rol === 'mover') { mov.x = mov.y = 0; pal.hidden = true; }
    if (t.rol === 'raton') { if (e.button === 0 || e.buttons === 0) disparando = false; if (e.button === 2) P.mira = false; }
    if (t.up) { t.up(); t.b.classList.remove('on'); }
  }
  addEventListener('pointerup', soltar); addEventListener('pointercancel', soltar);
  addEventListener('mousemove', e => { if (document.pointerLockElement === capa && jugando && !pausado) mirar(e.movementX, e.movementY, 0.0022); });
  capa.addEventListener('contextmenu', e => e.preventDefault());
  function boton(id, abajo, arriba) {
    const b = $(id);
    b.addEventListener('pointerdown', e => {
      e.stopPropagation(); e.preventDefault(); Snd.init(); if (!G || pausado && id !== 'bPausa') return;
      b.classList.add('on'); abajo && abajo();
      if (arriba) toques.set(e.pointerId, { rol: 'boton', up: arriba, b, x: e.clientX, y: e.clientY, mira: true });
      else setTimeout(() => b.classList.remove('on'), 140);
    });
    b.addEventListener('click', e => e.preventDefault());
  }
  const pulsaFuego = () => { disparando = true; G.pedido = 0.3; };
  boton('bFuego', pulsaFuego, () => disparando = false);
  boton('fuego2', pulsaFuego, () => disparando = false);
  boton('bMira', () => P.mira = !P.mira);
  boton('bRec', recargar);
  boton('bAgach', () => P.agach = !P.agach);
  boton('bGran', lanzarGranada);
  boton('bViva', gritoViva);
  boton('bArma', cambiarArma);
  boton('bCura', curar);
  boton('bAvion', pedirAvion);
  boton('bPausa', () => pausar(true));
  addEventListener('keydown', e => {
    if (!G || !jugando) return;
    teclas[e.code] = true;
    if (e.code === 'Escape') { pausar(!pausado); return; }
    if (pausado) return;
    if (e.code === 'KeyR') recargar(); else if (e.code === 'KeyG') lanzarGranada(); else if (e.code === 'KeyC') P.agach = !P.agach;
    else if (e.code === 'KeyV') gritoViva(); else if (e.code === 'KeyQ') cambiarArma(); else if (e.code === 'KeyH') curar(); else if (e.code === 'KeyB') pedirAvion();
  });
  addEventListener('keyup', e => { teclas[e.code] = false; });
  addEventListener('blur', () => { for (const k in teclas) teclas[k] = false; if (jugando && !pausado) pausar(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && jugando && !pausado) pausar(true); });

  window.__ifni = { get G() { return G; }, P, empezar, get ARMAS() { return ARMAS; }, trazar, cam, get jugando() { return jugando; } };

  UI.init(abrirParte);
  app.classList.toggle('zurdo', AJ.zurdo);
  redim(); alMenu(); requestAnimationFrame(bucle);
})();
